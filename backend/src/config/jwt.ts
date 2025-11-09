/**
 * JWT設定
 */

const secret = process.env.JWT_SECRET;
if (process.env.NODE_ENV !== 'development') {
  const s = secret ?? '';
  if (!s) {
    throw new Error('JWT_SECRET must be set in non-development environments');
  }
  // 弱い秘密鍵のパターンをチェック:
  // - 長さが32文字未満（ブルートフォース攻撃に脆弱）
  // - 危険なパターン: "secret", "changeme", "your-jwt", "your_jwt", "your jwt", "yourjwt"
  //   これらはデフォルト値やサンプル値として推測されやすい
  const looksWeak = s.length < 32 || /secret|changeme|your[-_ ]?jwt/i.test(s);
  if (looksWeak) {
    throw new Error('JWT_SECRET is too weak for non-development environments');
  }
}

export const jwtConfig = {
  /** JWT署名に使用する秘密鍵 */
  secret: process.env.JWT_SECRET || 'your-secret-key',

  /** アクセストークンの有効期限（秒） */
  accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '60m',

  /** リフレッシュトークンの有効期限（秒） */
  refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  /** アルゴリズム */
  algorithm: 'HS256' as const,
} as const;

// 環境変数の確認ログ（起動時に1回のみ出力）
console.log('[JWT Config] Environment variables check:');
console.log(
  '[JWT Config]   JWT_ACCESS_EXPIRES_IN:',
  process.env.JWT_ACCESS_EXPIRES_IN || '(not set, using default: 60m)'
);
console.log(
  '[JWT Config]   JWT_REFRESH_EXPIRES_IN:',
  process.env.JWT_REFRESH_EXPIRES_IN || '(not set, using default: 30d)'
);
console.log(
  '[JWT Config]   jwtConfig.accessTokenExpiresIn:',
  jwtConfig.accessTokenExpiresIn
);
console.log(
  '[JWT Config]   jwtConfig.refreshTokenExpiresIn:',
  jwtConfig.refreshTokenExpiresIn
);

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

  /** JWT ID（一意性を保証するためのランダムな識別子） */
  jti: string;

  /** 発行時刻（Unix timestamp） */
  iat: number;

  /** 有効期限（Unix timestamp） */
  exp?: number;
}
