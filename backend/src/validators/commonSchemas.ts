import { z } from 'zod';

/**
 * 共通パスワードスキーマ
 * 登録、リセット、変更で統一して使用
 */
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).*$/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  );

/**
 * パスワード変更のバリデーションスキーマ
 * 現在のパスワードと新しいパスワードが異なることを確認
 */
export const changePasswordSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordSchema,
}).refine(
  (v) => v.currentPassword !== v.newPassword,
  { message: 'New password must differ from current password', path: ['newPassword'] }
).strict();

/**
 * パスワード変更のリクエスト型
 */
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
