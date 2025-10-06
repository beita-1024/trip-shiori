/**
 * FastAPI サイドカーサービスのルーター
 *
 * Express から FastAPI サイドカーサービスへの
 * プロキシエンドポイントを提供する。
 */

import { Router } from 'express';
import { getFastAPIHealth, addNumbers } from './pythonServiceController';

const router = Router();

// FastAPI サイドカーサービスのヘルスチェック
router.get('/health', getFastAPIHealth);

// FastAPI サイドカーサービスで足し算を実行
router.post('/calc/add', addNumbers);

export default router;
