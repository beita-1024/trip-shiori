import { Request, Response, NextFunction } from 'express';

/**
 * レート制限の設定
 */
interface RateLimitConfig {
  /** 時間窓（ミリ秒） */
  windowMs: number;
  /** 最大リクエスト数 */
  maxRequests: number;
  /** エラーメッセージ */
  message?: string;
}

/**
 * メモリベースのレート制限ストレージ
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * レート制限のストレージ（メモリベース）
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * クライアントのIPアドレスを取得
 *
 * @param req Expressリクエストオブジェクト
 * @returns クライアントのIPアドレス
 */
const getClientIP = (req: Request): string => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    '127.0.0.1'
  );
};

/**
 * レート制限ミドルウェア
 *
 * @summary IPアドレスベースでリクエスト頻度を制限
 * @param config レート制限の設定
 * @returns Expressミドルウェア関数
 * @example
 *   app.use('/api/auth', rateLimit({ windowMs: 60000, maxRequests: 5 }));
 */
export const rateLimit = (config: RateLimitConfig) => {
  const { windowMs, maxRequests, message = 'Too many requests' } = config;

  return (req: Request, res: Response, next: NextFunction): void => {
    // テスト環境ではレート制限を無効化
    if (process.env.NODE_ENV === 'test') {
      next();
      return;
    }

    const clientIP = getClientIP(req);
    const now = Date.now();
    // const windowStart = now - windowMs;

    // 古いエントリをクリーンアップ
    for (const [ip, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(ip);
      }
    }

    // 現在のIPのエントリを取得または作成
    let entry = rateLimitStore.get(clientIP);

    if (!entry || entry.resetTime < now) {
      // 新しい時間窓を開始
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(clientIP, entry);
    }

    // リクエスト数をインクリメント
    entry.count++;

    // レート制限をチェック
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

      res.status(429).json({
        error: 'rate_limit_exceeded',
        message,
        retryAfter,
      });
      return;
    }

    // レスポンスヘッダーにレート制限情報を追加
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(
        0,
        maxRequests - entry.count
      ).toString(),
      'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
    });

    next();
  };
};

/**
 * パスワードリセット用のレート制限設定
 */
export const passwordResetRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  maxRequests: 15, // 最大15回
  message: 'パスワードリセットの試行回数が多すぎます。しばらく待ってから再試行してください。',
});

/**
 * パスワードリセット確認用のレート制限設定
 */
export const passwordResetConfirmRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  maxRequests: 20, // 最大20回
  message: 'パスワードリセット確認の試行回数が多すぎます。しばらく待ってから再試行してください。',
});

/**
 * Refresh Token用のレート制限設定
 */
export const refreshTokenRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10分
  maxRequests: 100, // 最大100回
  message: 'トークン更新の試行回数が多すぎます。しばらく待ってから再試行してください。',
});
