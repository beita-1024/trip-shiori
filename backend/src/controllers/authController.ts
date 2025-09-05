import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import crypto from 'crypto';
import { hashPassword, validatePasswordStrength } from '../utils/password';
import { sendEmailWithTemplate, createVerificationEmailTemplate } from '../utils/email';

const prisma = new PrismaClient();

// 検証トークンの有効期限（30分）
const EXPIRES_MS = 30 * 60 * 1000;

/**
 * ユーザー登録エンドポイント
 * 
 * @summary 新しいユーザーアカウントを作成し、メール認証を送信
 * @auth 認証不要
 * @params
 *   - Body: { email: string, password: string, name?: string }
 *   - Validation: メール形式、パスワード強度チェック
 * @returns
 *   - 204: 登録成功（メール送信完了）
 * @errors
 *   - 400: invalid_body（必須フィールド不足、形式エラー）
 *   - 409: already_exists（メールアドレス重複）
 *   - 500: internal_error（サーバーエラー、メール送信失敗）
 * @example
 *   POST /auth/register
 *   Body: { "email": "user@example.com", "password": "SecurePass123!", "name": "田中太郎" }
 *   204: No Content
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // 必須フィールドの検証
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'invalid_body',
        message: 'Email and password are required' 
      });
    }

    // メール形式の検証
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'invalid_body',
        message: 'Invalid email format' 
      });
    }

    // パスワード強度の検証
    if (!validatePasswordStrength(password)) {
      return res.status(400).json({ 
        error: 'invalid_body',
        message: 'Password does not meet strength requirements' 
      });
    }

    // 重複チェック
    const exists = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() } 
    });
    if (exists) {
      return res.status(409).json({ 
        error: 'already_exists',
        message: 'User with this email already exists' 
      });
    }

    // パスワードハッシュ化
    const passwordHash = await hashPassword(password);

    // ユーザー作成
    const user = await prisma.user.create({
      data: { 
        email: email.toLowerCase(), 
        name: name || null, 
        passwordHash, 
        emailVerified: null 
      },
    });

    // 検証トークン発行
    const raw = crypto.randomBytes(32).toString('hex');
    const tokenHash = await argon2.hash(raw, { type: argon2.argon2id });
    
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + EXPIRES_MS),
      },
    });

    // 検証URLを生成
    const verifyUrl = `${process.env.API_ORIGIN}/verify-email?uid=${encodeURIComponent(user.id)}&token=${encodeURIComponent(raw)}`;

    // メール送信
    try {
      const displayName = name || 'ユーザー';
      const emailTemplate = createVerificationEmailTemplate(displayName, verifyUrl);
      await sendEmailWithTemplate(email, emailTemplate);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // メール送信に失敗した場合でもユーザーは作成済みなので、エラーを返す
      return res.status(500).json({ 
        error: 'email_send_failed',
        message: 'User created but failed to send verification email' 
      });
    }

    return res.status(204).end();
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      error: 'internal_error',
      message: 'Internal server error' 
    });
  }
};
