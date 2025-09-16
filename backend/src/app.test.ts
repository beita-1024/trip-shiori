// src/app.test.ts

import request from 'supertest';
import app from './app';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";

import { testPrisma as prisma } from './config/prisma.test';

// テスト用のユーザーデータ
const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  name: 'テストユーザー',
};

const testUser2 = {
  email: 'app-test2@example.com',
  password: 'TestPassword123!',
  name: 'テストユーザー2',
};

let authCookie: string;
let authCookie2: string;
let testUserId: string;
let testUserId2: string;
let testItineraryId: string;
let testItineraryId2: string;

/**
 * WebAPI E2Eテスト
 * 
 * 各エンドポイントに対して1-2個のシンプルなテストを実行します。
 */
describe('WebAPI E2E Tests', () => {
  beforeAll(async () => {
    // テスト用ユーザーを作成
    const passwordHash = await argon2.hash(testUser.password, { type: argon2.argon2id });
    const user = await prisma.user.create({
      data: {
        email: testUser.email,
        passwordHash,
        name: testUser.name,
        emailVerified: new Date(),
      },
    });
    testUserId = user.id;

    const passwordHash2 = await argon2.hash(testUser2.password, { type: argon2.argon2id });
    const user2 = await prisma.user.create({
      data: {
        email: testUser2.email,
        passwordHash: passwordHash2,
        name: testUser2.name,
        emailVerified: new Date(),
      },
    });
    testUserId2 = user2.id;

    // ログインしてCookieを取得
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      })
      .set('Content-Type', 'application/json');
    authCookie = loginResponse.headers['set-cookie']?.[0] || '';

    const loginResponse2 = await request(app)
      .post('/auth/login')
      .send({
        email: testUser2.email,
        password: testUser2.password
      })
      .set('Content-Type', 'application/json');
    authCookie2 = loginResponse2.headers['set-cookie']?.[0] || '';

    // テスト用の旅程を作成
    const itinerary = await prisma.itinerary.create({
      data: {
        id: 'test_itinerary_1',
        data: JSON.stringify({
          title: 'テスト旅程1',
          days: []
        }),
        userId: testUserId,
      },
    });
    testItineraryId = itinerary.id;

    const itinerary2 = await prisma.itinerary.create({
      data: {
        id: 'test_itinerary_2',
        data: JSON.stringify({
          title: 'テスト旅程2',
          days: []
        }),
        userId: testUserId2,
      },
    });
    testItineraryId2 = itinerary2.id;
  });

  afterAll(async () => {
    // テストデータをクリーンアップ
    await prisma.itineraryShare.deleteMany({
      where: {
        itineraryId: {
          in: [testItineraryId, testItineraryId2]
        }
      }
    });
    await prisma.itinerary.deleteMany({
      where: {
        id: {
          in: [testItineraryId, testItineraryId2]
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [testUserId, testUserId2]
        }
      }
    });
    await prisma.$disconnect();
  });


  describe('GET /health', () => {
    test('ヘルスチェックエンドポイントが正常に応答する', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
    });
  });

  describe('POST /api/events/complete', () => {

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


  describe('旅程管理API', () => {
    describe('GET /api/itineraries', () => {
      test('認証済みユーザーが旅程一覧を取得できる', async () => {
        const response = await request(app)
          .get('/api/itineraries')
          .set('Cookie', authCookie);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('itineraries');
        expect(response.body).toHaveProperty('pagination');
        expect(Array.isArray(response.body.itineraries)).toBe(true);
      });

      test('認証されていない場合にエラーを返す', async () => {
        const response = await request(app)
          .get('/api/itineraries');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'unauthorized');
      });
    });

    describe('GET /api/itineraries/{id}', () => {
      test('所有者が旅程を取得できる', async () => {
        const response = await request(app)
          .get(`/api/itineraries/${testItineraryId}`)
          .set('Cookie', authCookie);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('title', 'テスト旅程1');
      });

      test('他人の旅程（共有設定なし）にアクセスできない', async () => {
        const response = await request(app)
          .get(`/api/itineraries/${testItineraryId2}`)
          .set('Cookie', authCookie);

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('error', 'forbidden');
      });

      test('無効なID形式で400エラーが返される', async () => {
        const response = await request(app)
          .get('/api/itineraries/invalid@id!')
          .set('Cookie', authCookie);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'invalid_params');
        expect(response.body).toHaveProperty('message', 'Request validation failed');
      });

      test('存在しないIDで404エラーが返される', async () => {
        const response = await request(app)
          .get('/api/itineraries/itn_nonexistent123')
          .set('Cookie', authCookie);

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'not_found');
        expect(response.body).toHaveProperty('message', 'Itinerary not found');
      });
    });

    describe('POST /api/itineraries', () => {
      test('認証済みユーザーが旅程を作成できる', async () => {
        const itineraryData = {
          title: '新しい旅程',
          days: []
        };

        const response = await request(app)
          .post('/api/itineraries')
          .send(itineraryData)
          .set('Cookie', authCookie)
          .set('Content-Type', 'application/json');

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('message', 'Itinerary created successfully');

        // 作成された旅程をクリーンアップ
        await prisma.itinerary.delete({
          where: { id: response.body.id }
        });
      });
    });

    describe('PUT /api/itineraries/{id}', () => {
      test('所有者が旅程を更新できる', async () => {
        const updateData = {
          title: '更新された旅程',
          days: []
        };

        const response = await request(app)
          .put(`/api/itineraries/${testItineraryId}`)
          .send(updateData)
          .set('Cookie', authCookie)
          .set('Content-Type', 'application/json');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Itinerary updated successfully');
      });

      test('他人の旅程を更新できない', async () => {
        const updateData = {
          title: '不正な更新',
          days: []
        };

        const response = await request(app)
          .put(`/api/itineraries/${testItineraryId2}`)
          .send(updateData)
          .set('Cookie', authCookie)
          .set('Content-Type', 'application/json');

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('error', 'forbidden');
      });

      test('無効なID形式で400エラーが返される', async () => {
        const updateData = {
          title: '更新された旅程',
          days: []
        };

        const response = await request(app)
          .put('/api/itineraries/invalid@id!')
          .send(updateData)
          .set('Cookie', authCookie)
          .set('Content-Type', 'application/json');

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'invalid_params');
        expect(response.body).toHaveProperty('message', 'Request validation failed');
      });
    });

    describe('DELETE /api/itineraries/{id}', () => {
      test('所有者が旅程を削除できる', async () => {
        // 削除用の旅程を作成
        const deleteItinerary = await prisma.itinerary.create({
          data: {
            id: 'delete_test_itinerary',
            data: JSON.stringify({ title: '削除テスト', days: [] }),
            userId: testUserId,
          },
        });

        const response = await request(app)
          .delete(`/api/itineraries/${deleteItinerary.id}`)
          .set('Cookie', authCookie);

        expect(response.status).toBe(204);
      });

      test('他人の旅程を削除できない', async () => {
        const response = await request(app)
          .delete(`/api/itineraries/${testItineraryId2}`)
          .set('Cookie', authCookie);

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('error', 'forbidden');
      });

      test('無効なID形式で400エラーが返される', async () => {
        const response = await request(app)
          .delete('/api/itineraries/invalid@id!')
          .set('Cookie', authCookie);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'invalid_params');
        expect(response.body).toHaveProperty('message', 'Request validation failed');
      });
    });
  });

  describe('旅程共有機能API', () => {
    describe('POST /api/itineraries/{id}/share', () => {
      test('所有者が共有設定を作成できる', async () => {
        const shareData = {
          permission: 'READ_ONLY',
          scope: 'PUBLIC_LINK'
        };

        const response = await request(app)
          .post(`/api/itineraries/${testItineraryId}/share`)
          .send(shareData)
          .set('Cookie', authCookie)
          .set('Content-Type', 'application/json');

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('shareUrl');
        expect(response.body).toHaveProperty('message', 'Share settings created successfully');
      });

      test('他人の旅程の共有設定を作成できない', async () => {
        const shareData = {
          permission: 'READ_ONLY',
          scope: 'PUBLIC_LINK'
        };

        const response = await request(app)
          .post(`/api/itineraries/${testItineraryId2}/share`)
          .send(shareData)
          .set('Cookie', authCookie)
          .set('Content-Type', 'application/json');

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('error', 'forbidden');
      });

      test('無効なID形式で400エラーが返される', async () => {
        const shareData = {
          permission: 'READ_ONLY',
          scope: 'PUBLIC_LINK'
        };

        const response = await request(app)
          .post('/api/itineraries/invalid@id!/share')
          .send(shareData)
          .set('Cookie', authCookie)
          .set('Content-Type', 'application/json');

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'invalid_params');
        expect(response.body).toHaveProperty('message', 'Request validation failed');
      });
    });

    describe('GET /api/itineraries/{id}/share', () => {
      test('共有設定を取得できる（認証不要）', async () => {
        const response = await request(app)
          .get(`/api/itineraries/${testItineraryId}/share`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('permission');
        expect(response.body).toHaveProperty('scope');
        expect(response.body).toHaveProperty('hasPassword');
      });

      test('無効なID形式で400エラーが返される', async () => {
        const response = await request(app)
          .get('/api/itineraries/invalid@id!/share');

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'invalid_params');
        expect(response.body).toHaveProperty('message', 'Request validation failed');
      });
    });

    describe('PUT /api/itineraries/{id}/share', () => {
      test('所有者が共有設定を更新できる', async () => {
        const updateData = {
          scope: 'PUBLIC'
        };

        const response = await request(app)
          .put(`/api/itineraries/${testItineraryId}/share`)
          .send(updateData)
          .set('Cookie', authCookie)
          .set('Content-Type', 'application/json');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Share settings updated successfully');
      });
    });

    describe('DELETE /api/itineraries/{id}/share', () => {
      test('所有者が共有設定を削除できる', async () => {
        const response = await request(app)
          .delete(`/api/itineraries/${testItineraryId}/share`)
          .set('Cookie', authCookie);

        expect(response.status).toBe(204);
      });
    });
  });

  describe('公開旅程アクセスAPI', () => {
    let publicItineraryId: string;

    beforeAll(async () => {
      // PUBLIC旅程を作成
      const publicItinerary = await prisma.itinerary.create({
        data: {
          id: 'public_test_itinerary',
          data: JSON.stringify({
            title: '公開テスト旅程',
            days: []
          }),
          userId: testUserId,
        },
      });
      publicItineraryId = publicItinerary.id;

      // PUBLIC共有設定を作成
      await prisma.itineraryShare.create({
        data: {
          itineraryId: publicItineraryId,
          permission: 'READ_ONLY',
          scope: 'PUBLIC',
        },
      });
    });

    afterAll(async () => {
      // 公開テストデータをクリーンアップ
      await prisma.itineraryShare.deleteMany({
        where: { itineraryId: publicItineraryId }
      });
      await prisma.itinerary.delete({
        where: { id: publicItineraryId }
      });
    });

    describe('GET /public/{id}', () => {
      test('PUBLIC旅程を取得できる（認証不要）', async () => {
        const response = await request(app)
          .get(`/public/${publicItineraryId}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('title', '公開テスト旅程');
        expect(response.body).toHaveProperty('_publicInfo');
        expect(response.body._publicInfo).toHaveProperty('scope', 'PUBLIC');
        expect(response.body._publicInfo).toHaveProperty('ogp');
      });

      test('存在しない旅程にアクセスできない', async () => {
        const response = await request(app)
          .get('/public/nonexistent');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'not_found');
      });

      test('無効なID形式で400エラーが返される', async () => {
        const response = await request(app)
          .get('/public/invalid@id!');

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'invalid_params');
        expect(response.body).toHaveProperty('message', 'Request validation failed');
      });
    });
  });

  describe('旅程複製・マイグレーションAPI', () => {
    let sharedItineraryId: string;

    beforeAll(async () => {
      // PUBLIC_LINK旅程を作成
      const sharedItinerary = await prisma.itinerary.create({
        data: {
          id: 'shared_test_itinerary',
          data: JSON.stringify({
            title: '共有テスト旅程',
            days: []
          }),
          userId: testUserId2,
        },
      });
      sharedItineraryId = sharedItinerary.id;

      // PUBLIC_LINK共有設定を作成
      await prisma.itineraryShare.create({
        data: {
          itineraryId: sharedItineraryId,
          permission: 'READ_ONLY',
          scope: 'PUBLIC_LINK',
        },
      });
    });

    afterAll(async () => {
      // 共有テストデータをクリーンアップ
      await prisma.itineraryShare.deleteMany({
        where: { itineraryId: sharedItineraryId }
      });
      await prisma.itinerary.delete({
        where: { id: sharedItineraryId }
      });
    });

    describe('POST /api/itineraries/copy/{id}', () => {
      test('認証済みユーザーが旅程を複製できる', async () => {
        const response = await request(app)
          .post(`/api/itineraries/copy/${sharedItineraryId}`)
          .set('Cookie', authCookie);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('message', 'Itinerary copied successfully');

        // 複製された旅程をクリーンアップ
        await prisma.itinerary.delete({
          where: { id: response.body.id }
        });
      });

      test('自分の旅程を複製できない', async () => {
        const response = await request(app)
          .post(`/api/itineraries/copy/${testItineraryId}`)
          .set('Cookie', authCookie);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      });

      test('認証されていない場合にエラーを返す', async () => {
        const response = await request(app)
          .post(`/api/itineraries/copy/${sharedItineraryId}`);

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'unauthorized');
      });

      test('無効なID形式で400エラーが返される', async () => {
        const response = await request(app)
          .post('/api/itineraries/copy/invalid@id!')
          .set('Cookie', authCookie);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'invalid_params');
        expect(response.body).toHaveProperty('message', 'Request validation failed');
      });
    });

    describe('POST /api/itineraries/migrate', () => {
      test('認証済みユーザーがローカル旅程を移行できる', async () => {
        const migrateData = {
          itineraries: [
            {
              id: 'local_123',
              data: {
                title: 'ローカル旅程1',
                days: []
              }
            },
            {
              id: 'local_456',
              data: {
                title: 'ローカル旅程2',
                days: []
              }
            }
          ]
        };

        const response = await request(app)
          .post('/api/itineraries/migrate')
          .send(migrateData)
          .set('Cookie', authCookie)
          .set('Content-Type', 'application/json');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('migrated', 2);
        expect(response.body).toHaveProperty('total', 2);
        expect(response.body).toHaveProperty('message');

        // 移行された旅程をクリーンアップ
        const migratedIds = response.body.migrated;
        if (migratedIds > 0) {
          // 移行された旅程のIDを取得してクリーンアップ
          const itineraries = await prisma.itinerary.findMany({
            where: {
              userId: testUserId,
              data: {
                contains: 'ローカル旅程'
              }
            }
          });
          await prisma.itinerary.deleteMany({
            where: {
              id: {
                in: itineraries.map(i => i.id)
              }
            }
          });
        }
      });

      test('認証されていない場合にエラーを返す', async () => {
        const migrateData = {
          itineraries: [
            {
              id: 'local_123',
              data: { title: 'テスト', days: [] }
            }
          ]
        };

        const response = await request(app)
          .post('/api/itineraries/migrate')
          .send(migrateData)
          .set('Content-Type', 'application/json');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'unauthorized');
      });
    });
  });
});
