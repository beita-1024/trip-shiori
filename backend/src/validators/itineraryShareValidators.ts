import { z } from 'zod';

/**
 * 共有権限の列挙型
 */
export const SharePermissionSchema = z.enum(['READ_ONLY', 'EDIT']);

/**
 * 公開範囲の列挙型
 */
export const ShareScopeSchema = z.enum(['PRIVATE', 'PUBLIC_LINK', 'PUBLIC']);

/**
 * 共有設定作成のバリデーションスキーマ
 */
export const createItineraryShareSchema = z.object({
  permission: SharePermissionSchema,
  password: z.string().min(8).max(128).optional(),
  expiresAt: z.string().datetime().optional(),
  scope: ShareScopeSchema,
}).refine((data) => {
  // expiresAtが過去の日時でないことを確認
  if (data.expiresAt) {
    const expiresDate = new Date(data.expiresAt);
    const now = new Date();
    return expiresDate > now;
  }
  return true;
}, {
  message: "expiresAt must be a future date",
  path: ["expiresAt"]
});

/**
 * 共有設定更新のバリデーションスキーマ（部分更新対応）
 */
export const updateItineraryShareSchema = z.object({
  permission: SharePermissionSchema.optional(),
  password: z.string().min(8).max(128).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  scope: ShareScopeSchema.optional(),
}).refine((data) => {
  // expiresAtが過去の日時でないことを確認
  if (data.expiresAt) {
    const expiresDate = new Date(data.expiresAt);
    const now = new Date();
    return expiresDate > now;
  }
  return true;
}, {
  message: "expiresAt must be a future date",
  path: ["expiresAt"]
});

/**
 * 共有設定作成のリクエスト型
 */
export type CreateItineraryShareRequest = z.infer<typeof createItineraryShareSchema>;

/**
 * 共有設定更新のリクエスト型
 */
export type UpdateItineraryShareRequest = z.infer<typeof updateItineraryShareSchema>;

/**
 * 共有権限の型
 */
export type SharePermission = z.infer<typeof SharePermissionSchema>;

/**
 * 公開範囲の型
 */
export type ShareScope = z.infer<typeof ShareScopeSchema>;
