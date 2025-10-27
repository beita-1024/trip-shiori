import { Router } from 'express';
import {
  createItineraryShare,
  getItineraryShare,
  updateItineraryShare,
  deleteItineraryShare,
} from './itineraryShareController';
import { validateBody, validateParams } from '../middleware/validation';
import { rateLimit } from '../middleware/rateLimit';
import { authenticateToken, checkItineraryOwnership } from '../middleware/auth';
import {
  createItineraryShareSchema,
  updateItineraryShareSchema,
} from '../validators/itineraryShareValidators';
import { pathParamsSchema } from '../validators/commonSchemas';

const router = Router();

/**
 * パスパラメータのバリデーションスキーマ
 * 共通の厳格なバリデーションを使用
 */
const idParamSchema = pathParamsSchema;

/**
 * 旅程共有機能のルート
 * 共有設定の作成・更新・削除は認証必須（所有者のみ）
 * 共有設定の取得は認証不要（共有リンク機能のため）
 * レート制限: 60 req/min（共有機能は比較的軽い処理のため）
 */
router.use(rateLimit({ windowMs: 60_000, maxRequests: 60 }));

// 共有設定管理CRUD
router.post(
  '/:id/share',
  validateParams(idParamSchema),
  authenticateToken,
  checkItineraryOwnership,
  validateBody(createItineraryShareSchema),
  createItineraryShare
); // 共有設定作成（認証必須）
router.get('/:id/share', validateParams(idParamSchema), getItineraryShare); // 共有設定取得（認証不要）
router.put(
  '/:id/share',
  authenticateToken,
  checkItineraryOwnership,
  validateParams(idParamSchema),
  validateBody(updateItineraryShareSchema),
  updateItineraryShare
); // 共有設定更新（認証必須）
router.delete(
  '/:id/share',
  authenticateToken,
  checkItineraryOwnership,
  validateParams(idParamSchema),
  deleteItineraryShare
); // 共有設定削除（認証必須）

export default router;
