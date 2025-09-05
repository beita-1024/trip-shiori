import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import crypto from 'crypto';
import { hashPassword, validatePasswordStrength, verifyPassword } from '../utils/password';
import { sendEmailWithTemplate, createVerificationEmailTemplate } from '../utils/email';
import { generateAccessToken } from '../utils/jwt';

const prisma = new PrismaClient();

// 検証トークンの有効期限（30分）
const EXPIRES_MS = 30 * 60 * 1000;

// Cookie設定
const COOKIE_NAME = 'access_token';
const COOKIE_MAX_AGE = 15 * 60 * 1000; // 15分

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
    const verifyUrl = `${process.env.APP_URL}/auth/verify-email?uid=${encodeURIComponent(user.id)}&token=${encodeURIComponent(raw)}`;

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

/**
 * メール認証エンドポイント
 * 
 * @summary メール認証トークンを検証し、ユーザーを認証済みに更新
 * @auth 認証不要
 * @params
 *   - Query: { uid: string, token: string }
 *   - Validation: トークンの有効性・期限チェック
 * @returns
 *   - 302: 認証成功（ダッシュボードへリダイレクト、JWT Cookie設定）
 * @errors
 *   - 400: invalid_token（無効・期限切れトークン）
 *   - 500: internal_error（サーバーエラー）
 * @example
 *   GET /auth/verify-email?uid=user123&token=abc123...
 *   302: Redirect to /dashboard
 */
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { uid, token } = req.query;

    // 必須パラメータの検証
    if (!uid || !token || typeof uid !== 'string' || typeof token !== 'string') {
      return res.status(400).send('Invalid or missing parameters');
    }

    // 期限内の最新トークンを取得
    const record = await prisma.emailVerificationToken.findFirst({
      where: { 
        userId: uid, 
        expiresAt: { gt: new Date() } 
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return res.status(400).send('Invalid or expired token');
    }

    // 生トークンとDBのハッシュを照合
    const isValidToken = await argon2.verify(record.tokenHash, token);
    if (!isValidToken) {
      return res.status(400).send('Invalid token');
    }

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: uid },
    });

    if (!user) {
      return res.status(400).send('User not found');
    }

    // ユーザーを verified にして、トークンは削除
    await prisma.$transaction([
      prisma.user.update({ 
        where: { id: uid }, 
        data: { emailVerified: new Date() } 
      }),
      prisma.emailVerificationToken.delete({ 
        where: { id: record.id } 
      }),
    ]);

    // 検証完了後に即ログイン：短命JWTをHttpOnly Cookieで返す
    const accessToken = generateAccessToken(user.id, user.email);
    res.cookie(COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });

    // ダッシュボード等へ遷移
    const appOrigin = process.env.APP_ORIGIN || 'http://localhost:3001';
    return res.redirect(`${appOrigin}/dashboard`);

  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).send('Internal server error');
  }
};

/**
 * ユーザーログインエンドポイント
 * 
 * @summary メールアドレスとパスワードでログインし、JWT Cookieを発行
 * @auth 認証不要
 * @params
 *   - Body: { email: string, password: string }
 *   - Validation: メール形式、パスワード検証
 * @returns
 *   - 204: ログイン成功（HttpOnly CookieでJWT発行）
 * @errors
 *   - 400: invalid_body（必須フィールド不足、形式エラー）
 *   - 401: unauthorized（認証失敗）
 *   - 403: forbidden（メール未認証）
 * @example
 *   POST /auth/login
 *   Body: { "email": "user@example.com", "password": "SecurePass123!" }
 *   204: No Content + Set-Cookie: access_token=<JWT>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=900
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

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

    // ユーザー検索
    const user = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() } 
    });
    if (!user) {
      return res.status(401).json({ 
        error: 'unauthorized',
        message: 'Invalid credentials' 
      });
    }

    // メール認証済みかチェック
    if (!user.emailVerified) {
      return res.status(403).json({ 
        error: 'forbidden',
        message: 'Email not verified' 
      });
    }

    // パスワード検証
    const isValidPassword = await verifyPassword(user.passwordHash, password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'unauthorized',
        message: 'Invalid credentials' 
      });
    }

    // JWTトークン生成
    const accessToken = generateAccessToken(user.id, user.email);

    // HttpOnly CookieでJWTを返す
    res.cookie(COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });

    return res.sendStatus(204);

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      error: 'internal_error',
      message: 'Internal server error' 
    });
  }
};

/**
 * ユーザーログアウトエンドポイント
 * 
 * @summary 認証済みユーザーをログアウトし、JWT Cookieを無効化
 * @auth Bearer JWT (Cookie)
 * @params
 *   - Cookie: access_token (JWT)
 * @returns
 *   - 204: ログアウト成功（Cookie無効化）
 * @errors
 *   - 401: unauthorized（未認証）
 * @example
 *   POST /auth/logout
 *   Cookie: access_token=<JWT>
 *   204: No Content + Clear-Cookie: access_token
 */
export const logout = async (req: Request, res: Response) => {
  try {
    // Cookieをクリア
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return res.sendStatus(204);

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ 
      error: 'internal_error',
      message: 'Internal server error' 
    });
  }
};
