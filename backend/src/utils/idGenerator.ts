import crypto from 'crypto';

/**
 * ランダムな英数字IDを生成する
 * 
 * @param length - 生成するIDの長さ（デフォルト: 20）
 * @returns ランダムな英数字の文字列
 * @example
 * generateRandomId(20) // "aB3cD9eF2gH5iJ8kL1mN"
 */
export function generateRandomId(length = 20): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.randomBytes(length);
  let id = "";
  for (let i = 0; i < length; i++) {
    id += alphabet[bytes[i] % alphabet.length];
  }
  return id;
}
