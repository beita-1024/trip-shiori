/**
 * Argon2設定
 */
export const argon2Config = {
  /** ハッシュ化のタイプ */
  type: 2, // Argon2id
  
  /** メモリ使用量（KB） */
  memoryCost: 2 ** 16, // 64MB
  
  /** 時間コスト（反復回数） */
  timeCost: 3,
  
  /** 並列度 */
  parallelism: 1,
  
  /** ハッシュ長（バイト） */
  hashLength: 32,
  
  /** ソルト長（バイト） */
  saltLength: 16,
} as const;

/**
 * パスワードハッシュ化の結果
 */
export interface PasswordHashResult {
  /** ハッシュ化されたパスワード */
  hash: string;
  
  /** 使用されたソルト */
  salt: string;
}
