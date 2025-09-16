import { Request, Response } from 'express';

/**
 * ヘルスチェックエンドポイント
 *
 * @param req - Expressリクエストオブジェクト
 * @param res - Expressレスポンスオブジェクト
 * @example
 * GET /health
 */
export const healthCheck = (_req: Request, res: Response) => {
  res.json({ ok: true });
};
