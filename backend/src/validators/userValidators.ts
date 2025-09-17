import { z } from 'zod';
import {
  passwordSchema,
  changePasswordSchema,
  type ChangePasswordRequest,
} from './commonSchemas';

/**
 * ユーザープロフィール更新のバリデーションスキーマ
 */
export const updateUserProfileSchema = z.object({
  name: z.string().max(255).optional(),
});

/**
 * アカウント削除のバリデーションスキーマ
 */
export const deleteAccountSchema = z.object({
  password: passwordSchema,
});

/**
 * ユーザープロフィール更新のリクエスト型
 */
export type UpdateUserProfileRequest = z.infer<typeof updateUserProfileSchema>;

/**
 * アカウント削除のリクエスト型
 */
export type DeleteAccountRequest = z.infer<typeof deleteAccountSchema>;

// 共通スキーマから再エクスポート
export { changePasswordSchema, type ChangePasswordRequest };
