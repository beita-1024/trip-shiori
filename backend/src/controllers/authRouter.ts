import express from 'express';
import { register, verifyEmail, login, logout, protectedResource } from './authController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// 認証関連のルート
router.post('/register', register);
router.get('/verify-email', verifyEmail);
router.post('/login', login);
router.post('/logout', authenticateToken, logout);
// これは動作確認用のルート
router.get('/protected', authenticateToken, protectedResource);

export default router;
