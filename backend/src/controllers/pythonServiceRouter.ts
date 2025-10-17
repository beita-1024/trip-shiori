/**
 * FastAPI sidecar service router
 */
import { Router } from 'express';
import { getFastAPIHealth, getFastAPIAuthHealth } from './pythonServiceController';

const router = Router();

/**
 * @summary FastAPI 内部サービスのヘルスチェック
 * @auth 認証不要
 * @returns 200: サービス稼働中
 * @errors
 *  - 503: FastAPI サービスが利用できません
 *  - 500: 内部サーバーエラー
 */
router.get('/health', getFastAPIHealth);

/**
 * @summary FastAPI 内部サービスの認証ヘルスチェック
 * @auth 認証不要（内部通信用）
 * @returns 200: 認証成功（{ status: string, message: string }）
 * @errors
 *  - 403: 認証トークンが無効です
 *  - 503: FastAPI サービスが利用できません
 *  - 500: 内部サーバーエラー
 */
router.get('/health/auth', getFastAPIAuthHealth);

export default router;
