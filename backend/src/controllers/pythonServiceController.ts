/**
 * FastAPI 内部サービスとの通信を担当するコントローラ
 *
 * Express から FastAPI 内部サービス（ポート6000番）への
 * HTTP プロキシ機能を提供する。
 */

import { Request, Response } from 'express';
import axios, { AxiosResponse } from 'axios';

// FastAPI 内部サービスのベースURL（環境変数優先）
const FASTAPI_BASE_URL =
  process.env.INTERNAL_AI_BASE_URL || 'http://ai:3000';

// 内部通信用トークン（ヘッダに付与）
const INTERNAL_AI_TOKEN = process.env.INTERNAL_AI_TOKEN || '';

// FastAPI からのレスポンス型定義
interface FastAPIHealthResponse {
  status: string;
  service: string;
  version: string;
}

interface FastAPIAddRequest {
  a: number;
  b: number;
}

interface FastAPIAddResponse {
  result: number;
  operation: string;
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
 * FastAPI 内部サービスで足し算を実行
 *
 * @summary 2つの数値の足し算を FastAPI 内部サービスで実行
 * @auth 認証不要
 * @params
 *   - Body: { a: number, b: number }
 * @returns 足し算の結果
 * @errors
 *   - 400: リクエストボディが不正な場合
 *   - 503: FastAPI サービスが利用できない場合
 *   - 500: 予期しないエラーが発生した場合
 * @example
 *   POST /api/python/calc/add
 *   Body: { "a": 1, "b": 2 }
 *   200: { "result": 3, "operation": "add" }
 */
export const addNumbers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { a, b }: FastAPIAddRequest = req.body;

    // 入力値の検証
    if (typeof a !== 'number' || typeof b !== 'number') {
      res.status(400).json({
        error: 'Invalid input',
        message: 'Both a and b must be numbers',
      });
      return;
    }

    const response: AxiosResponse<FastAPIAddResponse> = await axios.post(
      `${FASTAPI_BASE_URL}/calc/add`,
      { a, b },
      { timeout: 5000 }
    );

    res.status(200).json(response.data);
  } catch (error: unknown) {
    console.error('FastAPI calculation failed:', error);

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 400) {
        res.status(400).json({
          error: 'Bad request',
          message: error.response.data?.detail || 'Invalid calculation request',
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
      message: 'Failed to perform calculation',
    });
  }
};
