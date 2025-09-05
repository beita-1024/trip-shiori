import express from 'express';
import { register, verifyEmail } from './authController';

const router = express.Router();

// 認証関連のルート
router.post('/register', register);
router.get('/verify-email', verifyEmail);

export default router;
