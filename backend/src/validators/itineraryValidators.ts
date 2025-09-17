import { z } from 'zod';

/**
 * 旅程一覧取得のクエリパラメータバリデーションスキーマ
 */
export const getItinerariesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.enum(['createdAt', 'updatedAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  // 共有設定フィルター
  shareScope: z
    .union([
      z.enum([
        'PUBLIC_LINK',
        'RESTRICTED_EMAILS',
        'AUTHENTICATED_USERS',
        'PUBLIC',
      ]),
      z.array(
        z.enum([
          'PUBLIC_LINK',
          'RESTRICTED_EMAILS',
          'AUTHENTICATED_USERS',
          'PUBLIC',
        ])
      ),
    ])
    .optional(),
  sharePermission: z
    .union([
      z.enum(['READ_ONLY', 'EDIT']),
      z.array(z.enum(['READ_ONLY', 'EDIT'])),
    ])
    .optional(),
  // オプトイン機能
  includeShare: z.coerce.boolean().default(false),
  // 自分が作成したもののみか、共有されたものも含むか
  includeShared: z.coerce.boolean().default(false),
});

/**
 * 旅程作成のバリデーションスキーマ
 * 旅程データは任意のJSON形式を許可
 */
// TODO: 暫定仕様、後で修正する。
export const createItinerarySchema = z.record(z.string(), z.any());

/**
 * 旅程更新のバリデーションスキーマ
 * 旅程データは任意のJSON形式を許可
 */
// TODO: 暫定仕様、後で修正する。
export const updateItinerarySchema = z.record(z.string(), z.any());

/**
 * 旅程一覧取得のクエリパラメータ型
 */
export type GetItinerariesQuery = z.infer<typeof getItinerariesQuerySchema>;

/**
 * 旅程作成のリクエスト型
 */
export type CreateItineraryRequest = z.infer<typeof createItinerarySchema>;

/**
 * 旅程更新のリクエスト型
 */
export type UpdateItineraryRequest = z.infer<typeof updateItinerarySchema>;
