import argon2 from 'argon2';
import { argon2Config } from '../config/argon2';

/**
 * パスワードをハッシュ化する
 * @param password ハッシュ化するパスワード
 * @returns ハッシュ化されたパスワード
 * @throws Error ハッシュ化に失敗した場合
 * @example
 * const hashedPassword = await hashPassword('myPassword123');
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    return await argon2.hash(password, {
      type: argon2Config.type,
      memoryCost: argon2Config.memoryCost,
      timeCost: argon2Config.timeCost,
      parallelism: argon2Config.parallelism,
      hashLength: argon2Config.hashLength,
    });
  } catch (error) {
    throw new Error(`Password hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * パスワードを検証する
 * @param hashedPassword ハッシュ化されたパスワード
 * @param plainPassword 検証する平文パスワード
 * @returns パスワードが一致するかどうか
 * @throws Error 検証に失敗した場合
 * @example
 * const isValid = await verifyPassword(hashedPassword, 'myPassword123');
 */
export async function verifyPassword(hashedPassword: string, plainPassword: string): Promise<boolean> {
  try {
    return await argon2.verify(hashedPassword, plainPassword);
  } catch (error) {
    throw new Error(`Password verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// TODO: Zodでパスワード強度をチェックするコードにしたので不要かもしれない。
/**
 * パスワードの強度を検証する
 * @param password 検証するパスワード
 * @returns パスワードが要件を満たしているかどうか
 * @example
 * const isValid = validatePasswordStrength('MyPassword123!');
 */
export function validatePasswordStrength(password: string): boolean {
  // 最小8文字、大文字・小文字・数字・特殊文字を含む
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return (
    password.length >= minLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumbers &&
    hasSpecialChar
  );
}

/**
 * パスワードの強度を詳細に検証する
 * @param password 検証するパスワード
 * @returns パスワードの強度情報
 * @example
 * const strength = getPasswordStrength('MyPassword123!');
 * console.log(strength.score); // 0-4のスコア
 */
export function getPasswordStrength(password: string): {
  score: number;
  feedback: string[];
  isValid: boolean;
} {
  const feedback: string[] = [];
  let score = 0;
  
  // 長さチェック
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('パスワードは8文字以上である必要があります');
  }
  
  // 大文字チェック
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('大文字を含める必要があります');
  }
  
  // 小文字チェック
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('小文字を含める必要があります');
  }
  
  // 数字チェック
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('数字を含める必要があります');
  }
  
  // 特殊文字チェック
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  } else {
    feedback.push('特殊文字を含めることを推奨します');
  }
  
  return {
    score,
    feedback,
    isValid: score >= 4,
  };
}
