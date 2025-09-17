import jwt from 'jsonwebtoken';
import { jwtConfig, JWTPayload } from '../config/jwt';

/**
 * JWTトークンを生成する
 * @param payload ペイロード
 * @param expiresIn 有効期限（デフォルト: アクセストークンの有効期限）
 * @returns 生成されたJWTトークン
 * @throws Error トークン生成に失敗した場合
 * @example
 * const token = generateToken({ userId: '123', email: 'user@example.com', type: 'access' });
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
    { userId, email, type: 'access' },
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
    { userId, email, type: 'refresh' },
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
 */
export function generateTokenPair(
  userId: string,
  email: string
): {
  accessToken: string;
  refreshToken: string;
} {
  return {
    accessToken: generateAccessToken(userId, email),
    refreshToken: generateRefreshToken(userId, email),
  };
}
