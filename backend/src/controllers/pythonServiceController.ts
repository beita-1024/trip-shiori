/**
 * FastAPI 内部サービスとの通信を担当するコントローラ
 *
 * Express から FastAPI 内部サービス（ポート6000番）への
 * HTTP プロキシ機能を提供する。
 */

import { Request, Response } from 'express';
import axios, { AxiosResponse } from 'axios';

// FastAPI 内部サービスのベースURL（環境変数優先）
const FASTAPI_BASE_URL = process.env.INTERNAL_AI_BASE_URL || 'http://ai:3000';

// 内部通信用トークン（ヘッダに付与）
const INTERNAL_AI_TOKEN = process.env.INTERNAL_AI_TOKEN || '';

// FastAPI からのレスポンス型定義
interface FastAPIHealthResponse {
  status: string;
  service: string;
  version: string;
  environment_variables: Record<string, string>;
}

interface FastAPIAuthHealthResponse {
  status: string;
  message: string;
}

/**
 * FastAPI 内部サービスのヘルスチェック
 *
 * @summary FastAPI 内部サービスの稼働状況を確認
 * @auth 認証不要
 * @returns FastAPI のヘルスチェック結果
 * @errors
 *   - 503: FastAPI サービスが利用できない場合
 *   - 500: 予期しないエラーが発生した場合
 * @example
 *   GET /api/python/health
 *   200: { "status": "ok", "service": "fastapi-sidecar", "version": "0.1.0" }
 */
export const getFastAPIHealth = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const response: AxiosResponse<FastAPIHealthResponse> = await axios.get(
      `${FASTAPI_BASE_URL}/health`,
      { timeout: 5000 }
    );

    res.status(200).json(response.data);
  } catch (error: unknown) {
    console.error('FastAPI health check failed:', error);

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        res.status(503).json({
          error: 'FastAPI service unavailable',
          message: 'FastAPI sidecar service is not responding',
        });
        return;
      }
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to check FastAPI health',
    });
  }
};

/**
 * FastAPI 内部サービスの認証ヘルスチェック
 *
 * @summary FastAPI 内部サービスの認証トークンの妥当性を確認
 * @auth 認証不要（内部通信用）
 * @returns 認証結果
 * @errors
 *   - 403: 認証トークンが無効な場合
 *   - 503: FastAPI サービスが利用できない場合
 *   - 500: 予期しないエラーが発生した場合
 * @example
 *   GET /api/python/health/auth
 *   200: { "status": "ok", "message": "Internal token is valid" }
 */
export const getFastAPIAuthHealth = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const response: AxiosResponse<FastAPIAuthHealthResponse> = await axios.get(
      `${FASTAPI_BASE_URL}/health/auth`,
      {
        headers: {
          'X-Internal-Token': INTERNAL_AI_TOKEN,
        },
        timeout: 5000,
      }
    );

    res.status(200).json(response.data);
  } catch (error: unknown) {
    console.error('FastAPI auth health check failed:', error);

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 403) {
        res.status(403).json({
          error: 'Authentication failed',
          message: 'Internal token is invalid',
        });
        return;
      }

      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        res.status(503).json({
          error: 'FastAPI service unavailable',
          message: 'FastAPI sidecar service is not responding',
        });
        return;
      }
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to check FastAPI auth health',
    });
  }
};
