import { Router } from 'express';
import {
  getUserProfile,
  updateUserProfile,
  changePassword,
  deleteUserAccount,
} from './usersController';
import { authenticateToken, checkUserExists } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { rateLimit } from '../middleware/rateLimit';
import {
  updateUserProfileSchema,
  changePasswordSchema,
  deleteAccountSchema,
} from '../validators/userValidators';

const router = Router();

/**
 * ユーザー管理関連のルート
 * すべてのエンドポイントで認証が必要
 * レート制限: 120 req/min
 */
router.use(authenticateToken);
router.use(rateLimit({ windowMs: 60_000, maxRequests: 120 }));

// プロフィール管理
router.get('/profile', checkUserExists, getUserProfile);
router.put(
  '/profile',
  validateBody(updateUserProfileSchema),
  updateUserProfile
);

// パスワード管理
router.put('/password', validateBody(changePasswordSchema), changePassword);

// アカウント管理
// INFO: 当初はリクエストボディ付きのDELETEで実装していたが、
//       初期の仕様と違うが、OpenAPI仕様に準拠するため、現在はPOSTで実装している。
router.post(
  '/account/delete',
  validateBody(deleteAccountSchema),
  deleteUserAccount
);

export default router;
