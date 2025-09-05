import express from 'express';
import { register, verifyEmail, login, logout } from './authController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// 認証関連のルート
router.post('/register', register);
router.get('/verify-email', verifyEmail);
router.post('/login', login);
router.post('/logout', authenticateToken, logout);

export default router;
