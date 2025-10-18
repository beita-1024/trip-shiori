import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { jwtConfig, JWTPayload } from '../config/jwt';

/**
 * JWTトークンを生成する
 * @param payload ペイロード
 * @param expiresIn 有効期限（デフォルト: アクセストークンの有効期限）
 * @returns 生成されたJWTトークン
 * @throws Error トークン生成に失敗した場合
 * @example
 * const token = generateToken({ userId: '123', email: 'user@example.com', type: 'access', jti: 'unique-id' });
 */
export function generateToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  expiresIn: string = jwtConfig.accessTokenExpiresIn
): string {
  try {
    // 参考: https://www.npmjs.com/package/jsonwebtoken
    // jwt.sign(payload, secretOrPrivateKey, [options, callback])
    // options:
    //  - algorithm (default: HS256)
    //  - expiresIn: expressed in seconds or a string describing a time span vercel/ms.
    // ...

    return jwt.sign(payload, jwtConfig.secret, {
      expiresIn,
      algorithm: jwtConfig.algorithm,
    } as jwt.SignOptions);
  } catch (error) {
    throw new Error(
      `Token generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * JWTトークンを検証し、ペイロードを取得する
 * @param token 検証するJWTトークン
 * @returns デコードされたペイロード
 * @throws Error トークンが無効な場合
 * @example
 * const payload = verifyToken(token);
 * console.log(payload.userId);
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, jwtConfig.secret, {
      algorithms: [jwtConfig.algorithm],
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      throw new Error(
        `Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * アクセストークンを生成する
 * @param userId ユーザーID
 * @param email ユーザーのメールアドレス
 * @returns アクセストークン
 * @example
 * const accessToken = generateAccessToken('user123', 'user@example.com');
 */
export function generateAccessToken(userId: string, email: string): string {
  return generateToken(
    { userId, email, type: 'access', jti: crypto.randomUUID() },
    jwtConfig.accessTokenExpiresIn
  );
}

/**
 * リフレッシュトークンを生成する
 * @param userId ユーザーID
 * @param email ユーザーのメールアドレス
 * @returns リフレッシュトークン
 * @example
 * const refreshToken = generateRefreshToken('user123', 'user@example.com');
 */
export function generateRefreshToken(userId: string, email: string): string {
  return generateToken(
    { userId, email, type: 'refresh', jti: crypto.randomUUID() },
    jwtConfig.refreshTokenExpiresIn
  );
}

/**
 * トークンペア（アクセス・リフレッシュ）を生成する
 * @param userId ユーザーID
 * @param email ユーザーのメールアドレス
 * @returns アクセストークンとリフレッシュトークンのペア
 * @example
 * const { accessToken, refreshToken } = generateTokenPair('user123', 'user@example.com');
 *
 * @note 重要: JWTのiat（issued at）は秒単位で記録されるため、同じ秒内に複数のトークンを生成すると
 *       同じiatを持つトークンが作成される可能性がある。これにより、Refresh Token Rotationで
 *       古いトークンが新しいトークンと同じ文字列になってしまい、セキュリティ上の問題が発生する。
 *       この問題を回避するため、各トークンに一意のjti（JWT ID）を追加してトークンの一意性を保証する。
 */
export function generateTokenPair(
  userId: string,
  email: string
): {
  accessToken: string;
  refreshToken: string;
} {
  // 各トークンに一意のjtiを生成してトークンの一意性を保証
  const accessTokenJti = crypto.randomUUID();
  const refreshTokenJti = crypto.randomUUID();

  return {
    accessToken: generateToken(
      { userId, email, type: 'access', jti: accessTokenJti },
      jwtConfig.accessTokenExpiresIn
    ),
    refreshToken: generateToken(
      { userId, email, type: 'refresh', jti: refreshTokenJti },
      jwtConfig.refreshTokenExpiresIn
    ),
  };
}
