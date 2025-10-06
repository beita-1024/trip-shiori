import { Request, Response } from 'express';
import argon2 from 'argon2';
import crypto from 'crypto';
import { z } from 'zod';
import { passwordSchema } from '../validators/commonSchemas';
import { hashPassword, verifyPassword } from '../utils/password';
import {
  sendEmailWithTemplate,
  createVerificationEmailTemplate,
  createPasswordResetEmailTemplate,
} from '../utils/email';
import { generateAccessToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../config/prisma';

// 検証トークンの有効期限（30分）
const EXPIRES_MS = 30 * 60 * 1000;

// パスワードリセットトークンの有効期限（15分）
const PASSWORD_RESET_EXPIRES_MS = 15 * 60 * 1000;

// Cookie設定
const COOKIE_NAME = 'access_token';
const COOKIE_MAX_AGE = 15 * 60 * 1000; // 15分

// パスワードスキーマは共通スキーマからインポート

/**
 * Zodバリデーションエラーを400レスポンスに変換
 * @param error Zodエラー
 * @param res Expressレスポンスオブジェクト
 * @returns 400エラーレスポンス
 */
const handleZodError = (error: z.ZodError, res: Response) => {
  return res.status(400).json({
    error: 'invalid_body',
    message: 'Validation failed',
    details: error.issues.map((err: z.ZodIssue) => ({
      field: err.path.join('.'),
      message: err.message,
    })),
  });
};

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
    // Zodバリデーション
    const schema = z.object({
      email: z.string().trim().email(),
      password: passwordSchema,
      name: z.string().optional(),
    });

    const { email, password, name } = schema.parse(req.body);

    // 重複チェック（メール認証済みユーザーのみ）
    const exists = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (exists && exists.emailVerified) {
      return res.status(409).json({
        error: 'already_exists',
        message: 'User with this email already exists',
      });
    }

    // パスワードハッシュ化
    const passwordHash = await hashPassword(password);

    // ユーザー作成または更新
    const user = await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: {
        name: name || null,
        passwordHash,
        emailVerified: null,
        updatedAt: new Date(),
      },
      create: {
        email: email.toLowerCase(),
        name: name || null,
        passwordHash,
        emailVerified: null,
      },
    });

    // 既存の期限切れトークンを削除
    await prisma.emailVerificationToken.deleteMany({
      where: {
        userId: user.id,
        expiresAt: { lt: new Date() },
      },
    });

    // 新しい検証トークン発行
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
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?uid=${encodeURIComponent(user.id)}&token=${encodeURIComponent(raw)}`;

    // メール送信
    try {
      const displayName = name || 'ユーザー';
      const emailTemplate = createVerificationEmailTemplate(
        displayName,
        verifyUrl
      );
      await sendEmailWithTemplate(email, emailTemplate);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // メール送信に失敗した場合でもユーザーは作成済みなので、エラーを返す
      return res.status(500).json({
        error: 'email_send_failed',
        message: 'User created but failed to send verification email',
      });
    }

    return res.status(204).end();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error, res);
    }
    console.error('Registration error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Internal server error',
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
 *   - 200: 認証成功（JWT Cookie設定, JSON本文）
 *   - 400: invalid_token（無効・期限切れトークン）
 *   - 400: user_not_found（ユーザー不存在）
 *   - 500: internal_error（サーバーエラー）
 * @example
 *   GET /auth/verify-email?uid=user123&token=abc123...
 *   200: { "success": true, "message": "Email verification successful" }
 *        + Set-Cookie: access_token=<JWT>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=900
 */
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    // Zodバリデーション（クエリパラメータ）
    const schema = z.object({
      uid: z.string().min(1),
      token: z.string().min(1),
    });

    const { uid, token } = schema.parse(req.query);

    // 期限内の最新トークンを取得
    const record = await prisma.emailVerificationToken.findFirst({
      where: {
        userId: uid,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return res.status(400).json({
        error: 'invalid_token',
        message: 'Invalid or expired token',
      });
    }

    // 生トークンとDBのハッシュを照合
    const isValidToken = await argon2.verify(record.tokenHash, token);
    if (!isValidToken) {
      return res.status(400).json({
        error: 'invalid_token',
        message: 'Invalid token',
      });
    }

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: uid },
    });

    if (!user) {
      return res.status(400).json({
        error: 'user_not_found',
        message: 'User not found',
      });
    }

    // ユーザーを verified にして、トークンは削除
    await prisma.$transaction([
      prisma.user.update({
        where: { id: uid },
        data: { emailVerified: new Date() },
      }),
      prisma.emailVerificationToken.delete({
        where: { id: record.id },
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

    // 認証成功レスポンス（フロントエンドでリダイレクト処理）
    return res.status(200).json({
      success: true,
      message: 'Email verification successful',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error, res);
    }
    console.error('Email verification error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Internal server error',
    });
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
    // Zodバリデーション
    const schema = z.object({
      email: z.string().trim().email(),
      password: z.string(),
    });

    const { email, password } = schema.parse(req.body);

    // ユーザー検索
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Invalid credentials',
      });
    }

    // メール認証済みかチェック
    if (!user.emailVerified) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Email not verified',
      });
    }

    // パスワード検証
    const isValidPassword = await verifyPassword(user.passwordHash, password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Invalid credentials',
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
    if (error instanceof z.ZodError) {
      return handleZodError(error, res);
    }
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Internal server error',
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
      message: 'Internal server error',
    });
  }
};

/**
 * 保護されたリソースの例エンドポイント
 *
 * @summary 認証済みユーザーのみアクセス可能なリソースの例
 * @auth Bearer JWT (Cookie)
 * @params
 *   - Cookie: access_token (JWT)
 * @returns
 *   - 200: 認証済みユーザー情報
 * @errors
 *   - 401: unauthorized（未認証）
 * @example
 *   GET /auth/protected
 *   Cookie: access_token=<JWT>
 *   200: { "user": { "id": "user123", "email": "user@example.com" } }
 */
export const protectedResource = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    // 認証ミドルウェアでreq.userが設定されている
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Authentication required',
      });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
      },
      message: 'This is a protected resource',
    });
  } catch (error) {
    console.error('Protected resource error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Internal server error',
    });
  }
};

/**
 * パスワードリセットリクエストエンドポイント
 *
 * @summary メールアドレスを受け取り、パスワードリセットトークンを発行してメール送信
 * @auth 認証不要
 * @rateLimit 15分あたり3回
 * @idempotency 副作用ありだが常に204レスポンス
 * @params
 *   - Body: { email: string }
 *   - Validation: メール形式チェック
 * @returns
 *   - 204: リクエスト受付完了（存在不問で同一応答）
 * @errors
 *   - 400: invalid_body（必須フィールド不足、形式エラー）
 *   - 429: rate_limit_exceeded（レート制限超過）
 *   - 500: internal_error（サーバーエラー、メール送信失敗）
 * @example
 *   POST /auth/password-reset/request
 *   Body: { "email": "user@example.com" }
 *   204: No Content
 */
export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    // Zodバリデーション
    const schema = z.object({
      email: z.string().trim().email(),
    });

    const { email } = schema.parse(req.body);

    // ユーザー検索（存在しない場合でも同じレスポンスを返す）
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (user) {
      // 新しいパスワードリセットトークンを生成
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = await argon2.hash(rawToken, { type: argon2.argon2id });
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRES_MS);

      // upsertを使用して競合状態を防止（@@unique([userId])制約により1ユーザー1トークン）
      await prisma.passwordResetToken.upsert({
        where: { userId: user.id },
        update: {
          tokenHash,
          expiresAt,
          createdAt: new Date(),
        },
        create: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      // リセットURLを生成
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?uid=${encodeURIComponent(user.id)}&token=${encodeURIComponent(rawToken)}`;

      // メール送信
      try {
        const displayName = user.name || 'ユーザー';
        const emailTemplate = createPasswordResetEmailTemplate(
          displayName,
          resetUrl
        );
        await sendEmailWithTemplate(user.email, emailTemplate);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // メール送信に失敗した場合でも、セキュリティ上同じレスポンスを返す
      }
    }

    // セキュリティ上、ユーザーの存在に関係なく同じレスポンスを返す
    return res.status(204).end();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error, res);
    }
    console.error('Password reset request error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Internal server error',
    });
  }
};

/**
 * パスワードリセット確認エンドポイント
 *
 * @summary パスワードリセットトークンを検証し、新しいパスワードを設定
 * @auth 認証不要
 * @rateLimit 15分あたり5回
 * @idempotency トークン消費で非冪等（再実行時は「トークン無効」などのエラーを記載）
 * @params
 *   - Body: { uid: string, token: string, newPassword: string }
 *   - Validation: トークンの有効性・期限チェック、パスワード強度チェック
 * @returns
 *   - 204: パスワードリセット成功（passwordHashとpasswordChangedAt更新、トークン削除）
 * @errors
 *   - 400: invalid_body（必須フィールド不足、形式エラー）
 *   - 400: invalid_token（無効・期限切れトークン）
 *   - 429: rate_limit_exceeded（レート制限超過）
 *   - 500: internal_error（サーバーエラー）
 * @example
 *   POST /auth/password-reset/confirm
 *   Body: { "uid": "user123", "token": "abc123...", "newPassword": "NewSecurePass123!" }
 *   204: No Content
 */
export const confirmPasswordReset = async (req: Request, res: Response) => {
  try {
    // Zodバリデーション
    const schema = z.object({
      uid: z.string().min(1),
      token: z.string().min(1),
      newPassword: passwordSchema,
    });

    const { uid, token, newPassword } = schema.parse(req.body);

    // 期限内のパスワードリセットトークンを取得
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        userId: uid,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!resetToken) {
      return res.status(400).json({
        error: 'invalid_token',
        message: 'Invalid or expired token',
      });
    }

    // 生トークンとDBのハッシュを照合
    const isValidToken = await argon2.verify(resetToken.tokenHash, token);
    if (!isValidToken) {
      return res.status(400).json({
        error: 'invalid_token',
        message: 'Invalid token',
      });
    }

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: uid },
    });

    if (!user) {
      return res.status(400).json({
        error: 'user_not_found',
        message: 'User not found',
      });
    }

    // 新しいパスワードをハッシュ化
    const newPasswordHash = await hashPassword(newPassword);

    // パスワードを更新し、passwordChangedAtを設定、トークンを削除
    await prisma.$transaction(async (tx) => {
      // ユーザーのパスワードを更新
      await tx.user.update({
        where: { id: uid },
        data: {
          passwordHash: newPasswordHash,
          passwordChangedAt: new Date(),
        },
      });

      // トークンを削除（存在しない場合もエラーにならない）
      await tx.passwordResetToken.deleteMany({
        where: { id: resetToken.id },
      });
    });

    // 既存のCookieをクリア（JWT無効化）
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return res.status(204).end();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error, res);
    }
    console.error('Password reset confirmation error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Internal server error',
    });
  }
};
