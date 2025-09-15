import { Router } from 'express';
import { getPublicItinerary } from './publicItineraryController';
import { validateParams } from '../middleware/validation';
import { rateLimit } from '../middleware/rateLimit';
import { z } from 'zod';

const router = Router();

/**
 * パスパラメータのバリデーションスキーマ
 */
const idParamSchema = z.object({ 
  id: z.string().min(1, 'ID is required') 
});

/**
 * 公開旅程アクセス用のルート
 * 認証不要（PUBLICのため）
 * レート制限: 120 req/min（公開アクセスのため緩め）
 */
router.use(rateLimit({ windowMs: 60_000, maxRequests: 120 }));

// 公開旅程アクセス（OGP対応）
router.get('/:id', validateParams(idParamSchema), getPublicItinerary);

export default router;

