// src/app.ts

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { corsConfig } from './config/cors';
import itinerariesRouter from './controllers/itinerariesRouter';
import itineraryShareRouter from './controllers/itineraryShareRouter';
import sharedItineraryRouter from './controllers/sharedItineraryRouter';
import publicItineraryRouter from './controllers/publicItineraryRouter';
import itineraryCopyRouter from './controllers/itineraryCopyRouter';
import eventsRouter from './controllers/eventsRouter';
import itineraryEditRouter from './controllers/itineraryEditRouter';
import authRouter from './controllers/authRouter';
import usersRouter from './controllers/usersRouter';
import { healthCheck } from './controllers/healthController';
import { startShareCleanupJob } from './jobs/shareCleanupJob';

const app = express();

// ミドルウェアの設定
app.use(cors(corsConfig.options));
app.use(express.json());
app.use(cookieParser());

// ルートの設定
app.get('/health', healthCheck);
app.use('/api/itineraries', itineraryShareRouter);
app.use('/api/itineraries', itinerariesRouter);
app.use('/api/itineraries', itineraryCopyRouter);
app.use('/shared', sharedItineraryRouter);
app.use('/public', publicItineraryRouter);
app.use('/api/events', eventsRouter);
// テスト環境では旅程編集機能を無効化
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/itinerary-edit', itineraryEditRouter);
}
app.use('/api/users', usersRouter);
app.use('/auth', authRouter);

// テスト環境以外でのみサーバーを起動
if (process.env.NODE_ENV !== 'test') {
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    
    // 共有設定のクリーンアップジョブを開始
    startShareCleanupJob();
  });
}

export default app;