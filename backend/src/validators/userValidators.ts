import { z } from 'zod';

/**
 * ユーザープロフィール更新のバリデーションスキーマ
 */
export const updateUserProfileSchema = z.object({
  name: z.string().max(255).optional(),
});

/**
 * パスワード変更のバリデーションスキーマ
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

/**
 * アカウント削除のバリデーションスキーマ
 */
export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

/**
 * ユーザープロフィール更新のリクエスト型
 */
export type UpdateUserProfileRequest = z.infer<typeof updateUserProfileSchema>;

/**
 * パスワード変更のリクエスト型
 */
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;

/**
 * アカウント削除のリクエスト型
 */
export type DeleteAccountRequest = z.infer<typeof deleteAccountSchema>;
