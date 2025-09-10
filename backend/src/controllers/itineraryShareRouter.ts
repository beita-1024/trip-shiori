import { Router } from 'express';
import { 
  createItineraryShare, 
  getItineraryShare, 
  updateItineraryShare,
  deleteItineraryShare 
} from './itineraryShareController';
import { validateBody, validateParams } from '../middleware/validation';
import { rateLimit } from '../middleware/rateLimit';
import { z } from 'zod';
import { 
  createItineraryShareSchema,
  updateItineraryShareSchema
} from '../validators/itineraryShareValidators';

const router = Router();

/**
 * パスパラメータのバリデーションスキーマ
 */
const idParamSchema = z.object({ 
  id: z.string().min(1, 'ID is required') 
});

/**
 * 旅程共有機能のルート
 * 認証は不要（共有リンク機能のため）
 * レート制限: 30 req/min（共有機能は比較的軽い処理のため）
 */
router.use(rateLimit({ windowMs: 60_000, maxRequests: 30 }));

// 共有設定管理CRUD
router.post('/:id/share', validateParams(idParamSchema), validateBody(createItineraryShareSchema), createItineraryShare);     // 共有設定作成
router.get('/:id/share', validateParams(idParamSchema), getItineraryShare);                                                    // 共有設定取得
router.put('/:id/share', validateParams(idParamSchema), validateBody(updateItineraryShareSchema), updateItineraryShare);     // 共有設定更新（部分更新）
router.delete('/:id/share', validateParams(idParamSchema), deleteItineraryShare);                                             // 共有設定削除

export default router;
