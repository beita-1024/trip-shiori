import { z } from 'zod';

/**
 * 共通パスワードスキーマ
 * 登録、リセット、変更で統一して使用
 */
export const passwordSchema = z.string()
  .min(8, 'パスワードは8文字以上である必要があります')
  .max(1024, 'パスワードが長すぎます（最大1024文字）')
  .regex(
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).*$/,
    '大文字・小文字・数字・記号を各1文字以上含めてください'
  );

/**
 * パスワード変更のバリデーションスキーマ
 * 現在のパスワードと新しいパスワードが異なることを確認
 * 現在のパスワードは非空文字列のみ要求（既存ユーザーの弱いパスワード対応）
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '現在のパスワードは必須です'),
  newPassword: passwordSchema,
}).refine(
  (v) => v.currentPassword !== v.newPassword,
  { message: '新しいパスワードは現在のパスワードと異なる必要があります', path: ['newPassword'] }
).strict();

/**
 * パスワード変更のリクエスト型
 */
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
