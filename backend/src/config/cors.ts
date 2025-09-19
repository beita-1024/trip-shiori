/**
 * CORS設定
 *
 * 固定オリジンとCORS設定を管理
 * TODO: CORSのコードは後々整理する。
 */
export const corsConfig = {
  options: {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      const isDevelopment =
        process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV === 'dev';
      const frontendUrl = process.env.FRONTEND_URL;

      if (!isDevelopment && !frontendUrl) {
        // 起動時に落とすのがより安全だが、ここでは拒否しておく
        return callback(
          new Error('CORS misconfiguration: FRONTEND_URL is not set'),
          false
        );
      }

      // 本番環境では FRONTEND_URL のみを許可
      if (!isDevelopment) {
        // オリジンが未定義の場合（Postman等のツール）は許可
        if (!origin) {
          return callback(null, true);
        }

        // FRONTEND_URL と一致する場合のみ許可
        if (origin === frontendUrl) {
          return callback(null, true);
        }

        // 許可されていないオリジン
        console.error('CORS: Origin not allowed:', {
          origin,
          expected: frontendUrl,
          isDevelopment,
          nodeEnv: process.env.NODE_ENV,
        });
        callback(new Error('Not allowed by CORS'));
        return;
      }

      // 開発環境では追加のオリジンを許可
      const allowedOrigins = [
        frontendUrl, // フロントエンド
        'http://localhost:8081', // Swagger UI
        'http://localhost:3000', // ローカルSwagger UI
        'http://127.0.0.1:8081', // Swagger UI (127.0.0.1)
        'http://127.0.0.1:3000', // ローカルSwagger UI (127.0.0.1)
      ];

      // オリジンが未定義の場合（Postman等のツール）は許可
      if (!origin) {
        return callback(null, true);
      }

      // 許可リストに含まれているかチェック
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // 開発環境では localhost の任意のポートを許可
      if (
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        return callback(null, true);
      }

      // 許可されていないオリジン
      console.error('CORS: Origin not allowed (dev):', {
        origin,
        allowedOrigins,
        isDevelopment,
        nodeEnv: process.env.NODE_ENV,
      });
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-User-Id',
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  },
};
