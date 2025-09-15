import { Router } from 'express';
import { getSharedItinerary } from './publicItineraryController';
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
 * 共有旅程アクセス用のルート
 * 認証不要（PUBLIC_LINKのため）
 * レート制限: 120 req/min（共有アクセスのため緩め）
 */
router.use(rateLimit({ windowMs: 60_000, maxRequests: 120 }));

// 共有旅程アクセス
// /shared/:id のルート（共有リンク経由で旅程取得）
router.get('/:id', validateParams(idParamSchema), getSharedItinerary);

export default router;
