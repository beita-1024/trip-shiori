import { Router } from 'express';
import { copyItinerary, migrateLocalItineraries } from './itineraryCopyController';
import { authenticateToken } from '../middleware/auth';
import { validateParams, validateBody } from '../middleware/validation';
import { rateLimit } from '../middleware/rateLimit';
import { z } from 'zod';
import { pathParamsSchema } from '../validators/commonSchemas';

const router = Router();

/**
 * パスパラメータのバリデーションスキーマ
 * 共通の厳格なバリデーションを使用
 */
const idParamSchema = pathParamsSchema;

/**
 * 旅程複製・マイグレーション用のバリデーションスキーマ
 */
const migrateItinerariesSchema = z.object({
  itineraries: z.array(z.object({
    id: z.string().min(1, 'ID is required'),
    data: z.any(), // 任意のJSONオブジェクト
  })).min(1, 'At least one itinerary is required'),
});

/**
 * 旅程複製・マイグレーション機能のルート
 * すべてのエンドポイントで認証が必要
 * レート制限: 30 req/min（複製・マイグレーションは重い処理のため）
 */
router.use(authenticateToken);
router.use(rateLimit({ windowMs: 60_000, maxRequests: 30 }));

// 旅程複製・マイグレーション
router.post('/copy/:id', validateParams(idParamSchema), copyItinerary);  // 旅程複製
router.post('/migrate', validateBody(migrateItinerariesSchema), migrateLocalItineraries);  // ローカル保存マイグレーション

export default router;
