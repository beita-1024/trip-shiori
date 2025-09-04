// src/app.test.ts

// jsondiffpatchモジュールをモック
jest.mock('jsondiffpatch', () => ({
  create: jest.fn(() => ({
    patch: jest.fn(),
    diff: jest.fn(),
    unpatch: jest.fn()
  }))
}));

import request from 'supertest';
import app from './app';

/**
 * WebAPI E2Eテスト
 * 
 * 各エンドポイントに対して1-2個のシンプルなテストを実行します。
 */
describe('WebAPI E2E Tests', () => {
  describe('GET /health', () => {
    test('ヘルスチェックエンドポイントが正常に応答する', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
    });
  });

  describe('POST /api/events/complete', () => {
    test('イベント補完エンドポイントが正常に動作する（ダミーモード）', async () => {
      const requestBody = {
        event1: { time: '10:00', title: '出発' },
        event2: { time: '12:00', title: '到着' },
        dummy: true
      };

      const response = await request(app)
        .post('/api/events/complete')
        .send(requestBody)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('time');
      expect(response.body).toHaveProperty('end_time');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('icon');
    });

    test('必須パラメータが不足している場合にエラーを返す', async () => {
      const requestBody = {
        event1: { time: '10:00', title: '出発' }
        // event2が不足
      };

      const response = await request(app)
        .post('/api/events/complete')
        .send(requestBody)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('event1 and event2 are required');
    });
  });

  describe('GET /api/itinerary-edit/sample', () => {
    test('サンプル旅程データを正常に取得できる', async () => {
      const response = await request(app).get('/api/itinerary-edit/sample');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('itinerary');
      expect(response.body.data.itinerary).toHaveProperty('title');
      expect(response.body.data.itinerary).toHaveProperty('days');
    });
  });
});
