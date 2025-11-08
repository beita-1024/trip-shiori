import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { JWTPayload } from '../config/jwt';
import { prisma } from '../config/prisma';

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
  /** アクセストークンの有効期限（Unix timestamp、秒単位） */
  tokenExp?: number;
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
    console.log('[authenticateToken] Starting authentication');
    // CookieからJWTトークンを取得
    const token = req.cookies[COOKIE_NAME];

    console.log('[authenticateToken] Has access token cookie:', !!token);
    console.log('[authenticateToken] Cookie names:', Object.keys(req.cookies));

    if (!token) {
      console.log('[authenticateToken] No access token in cookie');
      res.status(401).json({
        error: 'unauthorized',
        message: 'Access token required',
      });
      return;
    }

    // JWTトークンを検証
    console.log('[authenticateToken] Verifying access token...');
    let payload: JWTPayload;
    try {
      payload = verifyToken(token);
      console.log('[authenticateToken] Access token verified:', {
        userId: payload.userId,
        type: payload.type,
        exp: payload.exp,
        expDate: payload.exp
          ? new Date(payload.exp * 1000).toISOString()
          : null,
        expMinutesFromNow: payload.exp
          ? (payload.exp * 1000 - Date.now()) / (60 * 1000)
          : null,
        iat: payload.iat,
      });
    } catch (error) {
      console.log(
        '[authenticateToken] Token verification failed:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      res.status(401).json({
        error: 'unauthorized',
        message: 'Invalid or expired token',
      });
      return;
    }

    // アクセストークンかチェック
    if (payload.type !== 'access') {
      console.log('[authenticateToken] Invalid token type:', payload.type);
      res.status(401).json({
        error: 'unauthorized',
        message: 'Invalid token type',
      });
      return;
    }

    // ユーザー情報を取得してパスワード変更日時をチェック
    console.log('[authenticateToken] Fetching user:', payload.userId);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, passwordChangedAt: true },
    });

    if (!user) {
      console.log('[authenticateToken] User not found:', payload.userId);
      res.status(401).json({
        error: 'unauthorized',
        message: 'User not found',
      });
      return;
    }

    // iatフィールドが存在しない場合は無効
    if (!payload.iat) {
      console.log('[authenticateToken] Missing iat field');
      res.status(401).json({
        error: 'unauthorized',
        message: 'Invalid token (missing iat)',
      });
      return;
    }

    // パスワード変更日時がJWT発行日時より後の場合は無効
    if (
      user.passwordChangedAt &&
      user.passwordChangedAt.getTime() > payload.iat * 1000
    ) {
      console.log(
        '[authenticateToken] Password changed after token creation. passwordChangedAt:',
        user.passwordChangedAt.toISOString(),
        'iat:',
        new Date(payload.iat * 1000).toISOString()
      );
      res.status(401).json({
        error: 'unauthorized',
        message: 'Token invalidated due to password change',
      });
      return;
    }

    // リクエストにユーザー情報を追加
    req.user = {
      id: user.id,
      email: user.email,
    };

    // トークンの有効期限をリクエストに追加（期限前リフレッシュ用）
    if (payload.exp) {
      req.tokenExp = payload.exp;
    }

    console.log(
      '[authenticateToken] Authentication successful for user:',
      user.id
    );
    next();
  } catch (error) {
    console.error('[authenticateToken] Authentication error:', error);
    res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid or expired token',
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

/**
 * 旅程所有権チェックミドルウェア（共有設定用）
 *
 * @summary 認証済みユーザーが指定された旅程の所有者かどうかをチェック
 * @auth Bearer JWT (Cookie: access_token) - 必須
 * @params
 *   - Path: { id: string } - 旅程ID
 * @returns
 *   - Next: 所有者の場合
 *   - 401: 認証失敗
 *   - 403: 所有者以外
 *   - 404: 旅程が見つからない
 * @example
 *   app.put('/api/itineraries/:id/share', authenticateToken, checkItineraryOwnership, updateShare);
 */
export const checkItineraryOwnership = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 認証チェック（authenticateTokenミドルウェアが先に実行されている前提）
    if (!req.user) {
      res.status(401).json({
        error: 'unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const { id } = req.params;

    // 旅程の存在確認と所有者チェック
    const itinerary = await prisma.itinerary.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!itinerary) {
      res.status(404).json({
        error: 'itinerary_not_found',
        message: 'Itinerary not found',
      });
      return;
    }

    // 所有者チェック
    if (itinerary.userId !== req.user.id) {
      res.status(403).json({
        error: 'forbidden',
        message: 'Only the owner can access this itinerary',
      });
      return;
    }

    // リクエストに旅程情報を追加（後続のミドルウェアやコントローラーで使用可能）
    (req as any).itinerary = itinerary;

    next();
  } catch (error) {
    console.error('Itinerary ownership check error:', error);
    res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to check itinerary ownership',
    });
  }
};

/**
 * 旅程所有権チェックミドルウェア（編集・削除用）
 *
 * @summary 認証済みユーザーが指定された旅程の所有者かどうかをチェック（編集・削除用）
 * @auth Bearer JWT (Cookie: access_token) - 必須
 * @params
 *   - Path: { id: string } - 旅程ID
 * @returns
 *   - Next: 所有者の場合
 *   - 401: 認証失敗
 *   - 403: 所有者以外
 *   - 404: 旅程が見つからない
 * @example
 *   app.put('/api/itineraries/:id', authenticateToken, checkItineraryOwnershipForEdit, updateItinerary);
 */
export const checkItineraryOwnershipForEdit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 認証チェック（authenticateTokenミドルウェアが先に実行されている前提）
    if (!req.user) {
      res.status(401).json({
        error: 'unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { id } = req.params;

    // 旅程の存在確認と所有者チェック
    const existingItinerary = await prisma.itinerary.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingItinerary) {
      res.status(404).json({
        error: 'not_found',
        message: 'Itinerary not found',
      });
      return;
    }

    if (existingItinerary.userId !== req.user.id) {
      res.status(403).json({
        error: 'forbidden',
        message: 'Access denied',
      });
      return;
    }

    // リクエストに旅程情報を追加（後続のミドルウェアやコントローラーで使用可能）
    (req as any).existingItinerary = existingItinerary;

    next();
  } catch (error) {
    console.error('Itinerary ownership check for edit error:', error);
    res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to check itinerary ownership',
    });
  }
};

/**
 * ユーザー存在確認ミドルウェア
 *
 * @summary 認証済みユーザーがデータベースに存在するかどうかをチェック
 * @auth Bearer JWT (Cookie: access_token) - 必須
 * @returns
 *   - Next: ユーザーが存在する場合
 *   - 401: 認証失敗またはユーザーが見つからない
 * @example
 *   app.get('/api/users/profile', authenticateToken, checkUserExists, getUserProfile);
 */
export const checkUserExists = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 認証チェック（authenticateTokenミドルウェアが先に実行されている前提）
    if (!req.user) {
      res.status(401).json({
        error: 'unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    // ユーザーの存在確認
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(401).json({
        error: 'unauthorized',
        message: 'User not found',
      });
      return;
    }

    // リクエストに完全なユーザー情報を追加（後続のミドルウェアやコントローラーで使用可能）
    (req as any).userProfile = user;

    next();
  } catch (error) {
    console.error('User existence check error:', error);
    res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to check user existence',
    });
  }
};
