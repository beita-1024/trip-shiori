import express from 'express';
import {
  register,
  verifyEmail,
  login,
  logout,
  protectedResource,
  requestPasswordReset,
  confirmPasswordReset,
  refreshToken,
} from './authController';
import { authenticateToken } from '../middleware/auth';
import {
  passwordResetRateLimit,
  passwordResetConfirmRateLimit,
  refreshTokenRateLimit,
} from '../middleware/rateLimit';

const router = express.Router();

// 認証関連のルート
router.post('/register', register);
router.get('/verify-email', verifyEmail);
router.post('/login', login);
router.post('/logout', authenticateToken, logout);
router.post('/refresh', refreshTokenRateLimit, refreshToken);

// パスワードリセット関連のルート
router.post(
  '/password-reset/request',
  passwordResetRateLimit,
  requestPasswordReset
);
router.post(
  '/password-reset/confirm',
  passwordResetConfirmRateLimit,
  confirmPasswordReset
);

// これは動作確認用のルート
router.get('/protected', authenticateToken, protectedResource);

export default router;
