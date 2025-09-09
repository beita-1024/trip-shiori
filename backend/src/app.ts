// src/app.ts

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { corsConfig } from './config/cors';
import itinerariesRouter from './controllers/itinerariesRouter';
import eventsRouter from './controllers/eventsRouter';
import itineraryEditRouter from './controllers/itineraryEditRouter';
import authRouter from './controllers/authRouter';
import usersRouter from './controllers/usersRouter';
import { healthCheck } from './controllers/healthController';

const app = express();

// ミドルウェアの設定
app.use(cors(corsConfig.options));
app.use(express.json());
app.use(cookieParser());

// ルートの設定
app.get('/health', healthCheck);
app.use('/api/itineraries', itinerariesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/itinerary-edit', itineraryEditRouter);
app.use('/api/users', usersRouter);
app.use('/auth', authRouter);

// テスト環境以外でのみサーバーを起動
if (process.env.NODE_ENV !== 'test') {
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

export default app;