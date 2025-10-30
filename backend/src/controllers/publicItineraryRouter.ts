import { Router } from 'express';
import { getPublicItinerary } from './publicItineraryController';
import { validateParams } from '../middleware/validation';
import { rateLimit } from '../middleware/rateLimit';
import { pathParamsSchema } from '../validators/commonSchemas';

const router = Router();

/**
 * パスパラメータのバリデーションスキーマ
 * 共通の厳格なバリデーションを使用
 */
const idParamSchema = pathParamsSchema;

/**
 * 公開旅程アクセス用のルート
 * 認証不要（PUBLICのため）
 * レート制限: 120 req/min（公開アクセスのため緩め）
 */
router.use(rateLimit({ windowMs: 60_000, maxRequests: 120 }));

/**
 * @summary 公開旅程の取得（現在一時停止中）
 * @returns 404: 機能一時停止中
 * @remarks 仕様調整のため一時停止。`PUBLIC_SHARING_ENABLED=true` で再開可能。
 */
// 一時停止方針: 仕様調整中は無効化。復帰はフラグで切替（PUBLIC_SHARING_ENABLED）。
router.get(
  '/:id',
  validateParams(idParamSchema),
  (req, res, next) => {
    const enabled =
      (process.env.PUBLIC_SHARING_ENABLED || 'false').toLowerCase() === 'true';
    if (!enabled) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Public sharing is temporarily unavailable',
      });
    }
    return next();
  },
  getPublicItinerary
);

export default router;
