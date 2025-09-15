import { Router } from 'express';
import { 
  createItinerary, 
  getItinerary, 
  getUserItineraries,
  updateItinerary,
  deleteItinerary,
  checkItineraryOwnership
} from './itinerariesController';
import { authenticateToken, checkItineraryOwnershipForEdit } from '../middleware/auth';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { rateLimit } from '../middleware/rateLimit';
import { z } from 'zod';
import { 
  getItinerariesQuerySchema,
  createItinerarySchema,
  updateItinerarySchema
} from '../validators/itineraryValidators';

const router = Router();

/**
 * パスパラメータのバリデーションスキーマ
 */
const idParamSchema = z.object({ 
  id: z.string().min(1, 'ID is required') 
});

/**
 * 旅のしおり関連のルート
 * すべてのエンドポイントで認証が必要
 * レート制限: 60 req/min
 */
router.use(authenticateToken);
router.use(rateLimit({ windowMs: 60_000, maxRequests: 60 }));

// 旅程管理CRUD
// TODO: createItinerarySchema, updateItinerarySchema は
//       現在緩いバリデーション（任意のJSONオブジェクト）だが、
//       旅程のフォーマットが固まったら厳密なスキーマに変更する
router.post('/', validateBody(createItinerarySchema), createItinerary);           // 旅程作成
router.get('/', validateQuery(getItinerariesQuerySchema), getUserItineraries);    // ユーザーの旅程一覧取得（ページネーション）
router.get('/:id', validateParams(idParamSchema), getItinerary);                  // 旅程詳細取得
router.get('/:id/ownership', validateParams(idParamSchema), checkItineraryOwnership); // 旅程所有者確認
router.put('/:id', validateParams(idParamSchema), validateBody(updateItinerarySchema), checkItineraryOwnershipForEdit, updateItinerary); // 旅程更新
router.delete('/:id', validateParams(idParamSchema), checkItineraryOwnershipForEdit, deleteItinerary);            // 旅程削除

export default router;
