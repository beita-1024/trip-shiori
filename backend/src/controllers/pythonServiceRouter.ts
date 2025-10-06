/**
 * FastAPI sidecar service router
 */
import { Router } from 'express';
import { getFastAPIHealth, addNumbers } from './pythonServiceController';

const router = Router();

/**
 * @summary FastAPI サイドカーサービスのヘルスチェック
 * @auth 認証不要
 * @returns 200: サービス稼働中
 * @errors
 *  - 503: FastAPI サービスが利用できません
 *  - 500: 内部サーバーエラー
 */
router.get('/health', getFastAPIHealth);

/**
 * @summary FastAPI サイドカーサービスで足し算を実行
 * @auth 認証不要
 * @params
 *  - body.a: number - 第1オペランド
 *  - body.b: number - 第2オペランド
 * @returns 200: 計算結果（{ result: number, operation: 'add' }）
 * @errors
 *  - 400: 入力が不正です
 *  - 503: FastAPI サービスが利用できません
 *  - 500: 内部サーバーエラー
 */
router.post('/calc/add', addNumbers);

export default router;
