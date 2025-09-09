import { z } from 'zod';

/**
 * 旅程一覧取得のクエリパラメータバリデーションスキーマ
 */
export const getItinerariesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.enum(['createdAt', 'updatedAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
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
