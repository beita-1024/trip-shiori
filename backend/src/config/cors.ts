/**
 * CORS設定
 * 
 * 許可されたオリジンのリストとCORS設定を管理
 */
export const corsConfig = {
  allowedOrigins: new Set([
    process.env.CLIENT_ORIGIN,
    'http://localhost:3001',               // 開発用
  ].filter(Boolean)),
  
  options: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || corsConfig.allowedOrigins.has(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
  }
};
