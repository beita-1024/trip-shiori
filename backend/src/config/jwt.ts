/**
 * JWT設定
 */

const secret = process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production' && (!secret || secret === 'your_jwt_secret_key_here_change_this_in_production')) {
  throw new Error('JWT_SECRET must be set in production');
}

export const jwtConfig = {
  /** JWT署名に使用する秘密鍵 */
  secret: process.env.JWT_SECRET || 'your-secret-key',
  
  /** アクセストークンの有効期限（秒） */
  accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  
  /** リフレッシュトークンの有効期限（秒） */
  refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  /** アルゴリズム */
  algorithm: 'HS256' as const,
} as const;

/**
 * JWTペイロードの型定義
 */
export interface JWTPayload {
  /** ユーザーID */
  userId: string;
  
  /** ユーザーのメールアドレス */
  email: string;
  
  /** トークンの種類 */
  type: 'access' | 'refresh';
  
  /** 発行時刻（Unix timestamp） */
  iat: number;
  
  /** 有効期限（Unix timestamp） */
  exp?: number;
}
