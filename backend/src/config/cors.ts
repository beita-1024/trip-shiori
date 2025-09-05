/**
 * CORS設定
 * 
 * 固定オリジンとCORS設定を管理
 */
export const corsConfig = {
  options: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  }
};
