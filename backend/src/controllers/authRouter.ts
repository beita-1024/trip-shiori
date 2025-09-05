import express from 'express';
import { register } from './authController';

const router = express.Router();

// 認証関連のルート
router.post('/register', register);

export default router;
