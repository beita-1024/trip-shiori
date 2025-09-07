import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../utils/jwt';
import { JWTPayload } from '../config/jwt';

const prisma = new PrismaClient();

// Cookie名の定数
const COOKIE_NAME = 'access_token';

/**
 * 認証済みユーザーのリクエストにユーザー情報を追加する拡張型
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

/**
 * JWT認証ミドルウェア
 * 
 * @summary CookieからJWTトークンを検証し、認証済みユーザー情報をリクエストに追加
 * @auth Cookie: access_token (JWT)
 * @params
 *   - Cookie: access_token (JWT)
 * @returns
 *   - Next: 認証成功（req.userにユーザー情報を設定）
 *   - 401: 認証失敗（トークン無効・期限切れ・パスワード変更後）
 * @example
 *   app.use('/protected', authenticateToken);
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // CookieからJWTトークンを取得
    const token = req.cookies[COOKIE_NAME];
    
    if (!token) {
      res.status(401).json({ 
        error: 'unauthorized',
        message: 'Access token required' 
      });
      return;
    }

    // JWTトークンを検証
    const payload: JWTPayload = verifyToken(token);
    
    // アクセストークンかチェック
    if (payload.type !== 'access') {
      res.status(401).json({ 
        error: 'unauthorized',
        message: 'Invalid token type' 
      });
      return;
    }

    // ユーザー情報を取得してパスワード変更日時をチェック
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, passwordChangedAt: true },
    });

    if (!user) {
      res.status(401).json({ 
        error: 'unauthorized',
        message: 'User not found' 
      });
      return;
    }

    // パスワード変更日時がJWT発行日時より後の場合は無効
    if (user.passwordChangedAt && payload.iat && user.passwordChangedAt.getTime() > payload.iat * 1000) {
      res.status(401).json({ 
        error: 'unauthorized',
        message: 'Token invalidated due to password change' 
      });
      return;
    }

    // リクエストにユーザー情報を追加
    req.user = {
      id: user.id,
      email: user.email,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ 
      error: 'unauthorized',
      message: 'Invalid or expired token' 
    });
  }
};

/**
 * オプショナル認証ミドルウェア
 * 
 * @summary 認証トークンがあれば検証し、なければそのまま通す
 * @auth オプショナル（Cookie: access_token）
 * @params
 *   - Cookie: access_token (JWT) - オプショナル
 * @returns
 *   - Next: 常に通す（トークンがあればreq.userに設定）
 * @example
 *   app.use('/optional-auth', optionalAuthenticate);
 */
export const optionalAuthenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.cookies[COOKIE_NAME];
    
    if (token) {
      const payload: JWTPayload = verifyToken(token);
      
      if (payload.type === 'access') {
        req.user = {
          id: payload.userId,
          email: payload.email,
        };
      }
    }
    
    next();
  } catch (error) {
    // エラーが発生してもそのまま通す（オプショナル認証のため）
    console.warn('Optional authentication failed:', error);
    next();
  }
};
