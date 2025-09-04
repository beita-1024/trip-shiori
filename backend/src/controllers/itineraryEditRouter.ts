/**
 * 旅程編集ルーター
 * 
 * 旅程編集機能のHTTPルーティングを定義します。
 */
import { Router } from 'express';
import { editItinerary } from './itineraryEditController';
import { sampleItinerary } from '../utils/sampleItinerary';

const router = Router();

/**
 * POST /api/itinerary-edit
 * 旅程を編集する
 * 
 * リクエストボディ:
 * {
 *   "originalItinerary": {
 *     "title": "旅程タイトル",
 *     "subtitle": "サブタイトル",
 *     "description": "説明",
 *     "days": [...]
 *   },
 *   "editPrompt": "変更したい内容の説明"
 * }
 * 
 * レスポンス:
 * {
 *   "success": true,
 *   "data": {
 *     "modifiedItinerary": {...},
 *     "diffPatch": {...},
 *     "changeDescription": "変更内容の説明"
 *   }
 * }
 */
router.post('/', editItinerary);

/**
 * GET /api/itinerary-edit/sample
 * テスト用サンプル旅程データを取得する
 * 
 * レスポンス:
 * {
 *   "success": true,
 *   "data": {
 *     "itinerary": {...}
 *   }
 * }
 */
router.get('/sample', (req, res) => {
  res.json({
    success: true,
    data: {
      itinerary: sampleItinerary
    }
  });
});

export default router;
