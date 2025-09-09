import { Router } from 'express';
import { 
  createItinerary, 
  getItinerary, 
  getUserItineraries,
  updateItinerary,
  deleteItinerary 
} from './itinerariesController';
import { authenticateToken } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validation';
import { 
  getItinerariesQuerySchema,
  createItinerarySchema,
  updateItinerarySchema
} from '../validators/itineraryValidators';

const router = Router();

/**
 * 旅のしおり関連のルート
 * すべてのエンドポイントで認証が必要
 */
router.use(authenticateToken);

// 旅程管理CRUD
// TODO: createItinerarySchema, updateItinerarySchema は
//       現在緩いバリデーション（任意のJSONオブジェクト）だが、
//       旅程のフォーマットが固まったら厳密なスキーマに変更する
router.post('/', validateBody(createItinerarySchema), createItinerary);           // 旅程作成
router.get('/', validateQuery(getItinerariesQuerySchema), getUserItineraries);    // ユーザーの旅程一覧取得（ページネーション）
router.get('/:id', getItinerary);            // 旅程詳細取得
router.put('/:id', validateBody(updateItinerarySchema), updateItinerary);         // 旅程更新
router.delete('/:id', deleteItinerary);      // 旅程削除

export default router;
