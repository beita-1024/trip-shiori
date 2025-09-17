import helmet from 'helmet';
import { helmetConfig } from '../config/helmet';

/**
 * Helmetミドルウェアを設定する
 * @returns Helmetミドルウェア
 * @example
 * app.use(setupHelmet());
 */
export function setupHelmet() {
  return helmet(helmetConfig);
}

/**
 * セキュリティヘッダーを追加するカスタムミドルウェア
 * @param req Expressリクエスト
 * @param res Expressレスポンス
 * @param next 次のミドルウェア
 * @example
 * app.use(addSecurityHeaders);
 */
export function addSecurityHeaders(req: any, res: any, next: any): void {
  // X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options
  res.setHeader('X-Frame-Options', 'DENY');

  // X-XSS-Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer-Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );

  next();
}

/**
 * レート制限用のミドルウェア（簡易版）
 * @param windowMs 時間窓（ミリ秒）
 * @param maxRequests 最大リクエスト数
 * @returns レート制限ミドルウェア
 * @example
 * app.use(createRateLimit(15 * 60 * 1000, 100)); // 15分間に100リクエスト
 */
export function createRateLimit(windowMs: number, maxRequests: number) {
  const requests = new Map<string, { count: number; resetTime: number }>();
  let lastCleanup = 0;

  return (req: any, res: any, next: any): void => {
    // NOTE: reverse proxy 環境では app.set('trust proxy', true) 前提
    const clientId = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    const now = Date.now();

    // 古いエントリのクリーンアップ（最短でも100ms間隔）
    if (now - lastCleanup > 100) {
      for (const [key, value] of requests) {
        if (now > value.resetTime) requests.delete(key);
      }
      lastCleanup = now;
    }

    const clientData = requests.get(clientId);

    if (!clientData) {
      // 新しいクライアント
      requests.set(clientId, {
        count: 1,
        resetTime: now + windowMs,
      });
      next();
    } else if (now > clientData.resetTime) {
      // 時間窓がリセットされた
      requests.set(clientId, {
        count: 1,
        resetTime: now + windowMs,
      });
      next();
    } else if (clientData.count >= maxRequests) {
      // レート制限に達した
      const retryAfterSec = Math.ceil((clientData.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec.toString());
      res.status(429).json({
        error: 'Too Many Requests',
        message:
          'レート制限に達しました。しばらく時間をおいてから再試行してください。',
        retryAfter: retryAfterSec,
      });
    } else {
      // リクエスト数を増加
      clientData.count++;
      next();
    }
  };
}

/**
 * CORS設定を強化する
 * @param allowedOrigins 許可するオリジン
 * @returns CORS設定オブジェクト
 * @example
 * const corsOptions = createSecureCorsOptions(['https://example.com']);
 */
export function createSecureCorsOptions(allowedOrigins: string[]) {
  return {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      // 同じオリジンからのリクエストは許可
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy violation'), false);
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  };
}

/**
 * 入力値のサニタイズ（XSS対策）
 * @param input サニタイズする入力値
 * @returns サニタイズされた値
 * @example
 * const sanitized = sanitizeInput('<script>alert("xss")</script>');
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // HTMLタグの基本文字を除去
    .replace(/javascript:/gi, '') // javascript:プロトコルを除去
    .replace(/on\w+=/gi, '') // イベントハンドラーを除去
    .trim();
}

/**
 * SQLインジェクション対策のための入力値エスケープ
 * @param input エスケープする入力値
 * @returns エスケープされた値
 * @example
 * const escaped = escapeSqlInput("'; DROP TABLE users; --");
 */
export function escapeSqlInput(input: string): string {
  return input
    .replace(/'/g, "''") // シングルクォートをエスケープ
    .replace(/--/g, '') // SQLコメントを除去
    .replace(/;/g, '') // セミコロンを除去
    .replace(/\0/g, '') // NULL文字を除去
    .replace(/\n/g, '') // 改行を除去
    .replace(/\r/g, ''); // キャリッジリターンを除去
}
