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
import { generateTokenPair } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../config/prisma';

// 検証トークンの有効期限（30分）
const EXPIRES_MS = 30 * 60 * 1000;

// パスワードリセットトークンの有効期限（15分）
const PASSWORD_RESET_EXPIRES_MS = 15 * 60 * 1000;

// Cookie設定
const COOKIE_NAME = 'access_token';
const REFRESH_COOKIE_NAME = 'refresh_token';
const COOKIE_MAX_AGE = 15 * 60 * 1000; // 15分
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7日

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
 * Refresh Tokenをデータベースに保存する
 * @param userId ユーザーID
 * @param refreshToken リフレッシュトークン
 * @param deviceInfo デバイス情報（User-Agent等）
 * @returns 保存されたRefreshTokenレコード
 */
const saveRefreshToken = async (
  userId: string,
  refreshToken: string,
  deviceInfo?: string
) => {
  const tokenHash = await argon2.hash(refreshToken, { type: argon2.argon2id });
  const secret = process.env.REFRESH_TOKEN_FINGERPRINT_SECRET;
  if (!secret) throw new Error('Missing REFRESH_TOKEN_FINGERPRINT_SECRET');
  const fingerprint = crypto
    .createHmac('sha256', secret)
    .update(refreshToken)
    .digest('hex');
  const expiresAt = new Date(Date.now() + REFRESH_COOKIE_MAX_AGE);

  return await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      fingerprint,
      expiresAt,
      deviceInfo: deviceInfo || null,
    },
  });
};

/**
 * Refresh Tokenを検証し、ユーザー情報を取得する
 * @param refreshToken リフレッシュトークン
 * @returns ユーザー情報とトークンレコード、および失効状態
 */
const verifyRefreshToken = async (refreshToken: string) => {
  const secret = process.env.REFRESH_TOKEN_FINGERPRINT_SECRET;
  if (!secret) throw new Error('Missing REFRESH_TOKEN_FINGERPRINT_SECRET');
  const fingerprint = crypto
    .createHmac('sha256', secret)
    .update(refreshToken)
    .digest('hex');

  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { fingerprint },
    include: {
      user: { select: { id: true, email: true, passwordChangedAt: true } },
    },
  });

  if (!tokenRecord || tokenRecord.expiresAt <= new Date()) return null;

  const isValid = await argon2.verify(tokenRecord.tokenHash, refreshToken);
  if (!isValid) return null;

  if (tokenRecord.isRevoked) {
    return { user: tokenRecord.user, tokenRecord, isRevoked: true };
  }

  if (
    tokenRecord.user.passwordChangedAt &&
    tokenRecord.createdAt < tokenRecord.user.passwordChangedAt
  ) {
    return { user: tokenRecord.user, tokenRecord, isPasswordChanged: true };
  }

  return { user: tokenRecord.user, tokenRecord };
};

/**
 * ユーザーの全Refresh Tokenを失効させる
 * @param userId ユーザーID
 */
const revokeAllUserRefreshTokens = async (userId: string) => {
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
  });
};

/**
 * 期限切れのRefresh Tokenをクリーンアップする
 */
const cleanupExpiredRefreshTokens = async () => {
  await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        {
          isRevoked: true,
          lastUsedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        }, // 失効後24時間経過
      ],
    },
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

    // 検証完了後に即ログイン：トークンペアをHttpOnly Cookieで返す
    const { accessToken, refreshToken } = generateTokenPair(
      user.id,
      user.email
    );

    // Refresh Tokenをデータベースに保存
    const deviceInfo = req.headers['user-agent'] || undefined;
    await saveRefreshToken(user.id, refreshToken, deviceInfo);

    res.cookie(COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_COOKIE_MAX_AGE,
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

    // トークンペア生成
    const { accessToken, refreshToken } = generateTokenPair(
      user.id,
      user.email
    );

    // Refresh Tokenをデータベースに保存
    const deviceInfo = req.headers['user-agent'] || undefined;
    await saveRefreshToken(user.id, refreshToken, deviceInfo);

    // HttpOnly Cookieでトークンを返す
    res.cookie(COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_COOKIE_MAX_AGE,
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
export const logout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // ユーザーIDを取得（認証ミドルウェアで設定済み）
    const userId = req.user?.id;

    if (userId) {
      // ユーザーの全Refresh Tokenを失効させる
      await revokeAllUserRefreshTokens(userId);
    }

    // Cookieをクリア
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.clearCookie(REFRESH_COOKIE_NAME, {
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

    // 期限内のパスワードリセットトークンを取得（最新）
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: { userId: uid, expiresAt: { gt: new Date() } },
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

    // パスワードを更新し、passwordChangedAtを設定、トークンを削除、Refresh Tokenを失効
    await prisma.$transaction(async (tx) => {
      // ユーザーのパスワードを更新
      await tx.user.update({
        where: { id: uid },
        data: {
          passwordHash: newPasswordHash,
          passwordChangedAt: new Date(),
        },
      });

      // パスワードリセットトークンを削除
      await tx.passwordResetToken.deleteMany({
        where: { id: resetToken.id },
      });

      // 全Refresh Tokenを失効させる（セキュリティ侵害時の対応）
      await tx.refreshToken.updateMany({
        where: { userId: uid, isRevoked: false },
        data: { isRevoked: true },
      });
    });

    // 既存のCookieをクリア（JWT無効化）
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.clearCookie(REFRESH_COOKIE_NAME, {
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

/**
 * Refresh Tokenエンドポイント
 *
 * @summary Refresh Tokenを使用して新しいトークンペアを発行
 * @auth Public（Refresh Token Cookie必須）
 * @rateLimit 10 req/min（IPベース）
 * @params
 *   - Cookie: refresh_token（HttpOnly/Secure/SameSite=lax）
 * @returns
 *   - 204: 新しいトークンペア（Set-Cookie: access_token, refresh_token）
 * @errors
 *   - 401: unauthorized（トークン無効/期限切れ/失効済み/パスワード変更）
 *   - 429: rate_limit_exceeded（レート制限超過）
 *   - 500: internal_error（サーバーエラー）
 * @example
 *   POST /auth/refresh
 *   Cookie: refresh_token=<JWT>
 *   204: No Content + Set-Cookie: access_token=<new_JWT>; refresh_token=<new_JWT>
 */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const clearAuthCookies = () => {
      res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      res.clearCookie(REFRESH_COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    };

    // CookieからRefresh Tokenを取得
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      clearAuthCookies();
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Refresh token required',
      });
    }

    // Refresh Tokenを検証
    const tokenData = await verifyRefreshToken(refreshToken);
    if (!tokenData) {
      clearAuthCookies();
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Invalid or expired refresh token',
      });
    }

    const { user, tokenRecord, isRevoked, isPasswordChanged } = tokenData;

    // 失効済みトークンの場合
    if (isRevoked) {
      clearAuthCookies();
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Token has been revoked',
      });
    }

    // パスワード変更により無効化されたトークンの場合
    if (isPasswordChanged) {
      clearAuthCookies();
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Token invalidated due to password change',
      });
    }

    // 期限切れトークンのクリーンアップ（非同期で実行）
    cleanupExpiredRefreshTokens().catch(console.error);

    // 新しいトークンペアを生成
    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(
      user.id,
      user.email
    );

    // トランザクション内でRefresh Token Rotationを実行
    const deviceInfo = req.headers['user-agent'] || undefined;

    // 新しいRefresh Tokenのハッシュとfingerprintを事前に生成
    const tokenHash = await argon2.hash(newRefreshToken, {
      type: argon2.argon2id,
    });
    const secret = process.env.REFRESH_TOKEN_FINGERPRINT_SECRET;
    if (!secret) throw new Error('Missing REFRESH_TOKEN_FINGERPRINT_SECRET');
    const fingerprint = crypto
      .createHmac('sha256', secret)
      .update(newRefreshToken)
      .digest('hex');
    const expiresAt = new Date(Date.now() + REFRESH_COOKIE_MAX_AGE);

    // 競合対策：updateManyで件数チェック
    const rotated = await prisma.$transaction(async (tx) => {
      const { count } = await tx.refreshToken.updateMany({
        where: { id: tokenRecord.id, isRevoked: false },
        data: { isRevoked: true, lastUsedAt: new Date() },
      });
      if (count !== 1) return false;

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash,
          fingerprint,
          expiresAt,
          deviceInfo,
        },
      });
      return true;
    });

    if (!rotated) {
      clearAuthCookies();
      return res
        .status(401)
        .json({ error: 'unauthorized', message: 'Token has been revoked' });
    }

    // 新しいトークンをCookieで返す
    res.cookie(COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_COOKIE_MAX_AGE,
    });

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Vary', 'Cookie');

    return res.sendStatus(204);
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Internal server error',
    });
  }
};
