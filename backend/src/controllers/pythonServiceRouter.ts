/**
 * FastAPI sidecar service router
 */
import { Router } from 'express';
import {
  getFastAPIHealth,
  getFastAPIAuthHealth,
} from './pythonServiceController';

const router = Router();

/**
 * @summary FastAPI 内部サービスのヘルスチェック
 * @auth 認証不要
 * @returns 200: サービス稼働中
 * @errors
 *  - 503: FastAPI サービスが利用できません
 *  - 500: 内部サーバーエラー
 * @example
 *   GET /api/python/health
 *   200: { "status": "ok", "service": "fastapi-sidecar", "version": "0.1.0" }
 */
router.get('/health', getFastAPIHealth);

/**
 * @summary FastAPI 内部サービスの認証ヘルスチェック
 * @auth 認証不要（内部通信用）
 * @returns 200: 認証成功
 * @errors
 *  - 403: 認証トークンが無効です
 *  - 503: FastAPI サービスが利用できません
 *  - 500: 内部サーバーエラー
 * @example
 *   GET /api/python/health/auth
 *   200: { "status": "ok", "message": "Internal token is valid" }
 */
router.get('/health/auth', getFastAPIAuthHealth);

export default router;
