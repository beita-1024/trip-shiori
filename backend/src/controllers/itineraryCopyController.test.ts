import request from 'supertest';
import app from '../app';
import argon2 from 'argon2';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

import { testPrisma as prisma } from '../config/prisma.test';

// テスト用のユーザーデータ
const testUser1 = {
  email: 'copy-test1@example.com',
  password: 'TestPassword123!',
  name: '複製テストユーザー1',
};

const testUser2 = {
  email: 'copy-test2@example.com',
  password: 'TestPassword123!',
  name: '複製テストユーザー2',
};

let testUserId1: string;
let testUserId2: string;
let testItineraryId1: string;
let testItineraryId2: string;
let authCookie1: string;
// let authCookie2: string;

/**
 * 旅程複製・マイグレーションAPIのテスト
 */
describe('Itinerary Copy & Migration API Tests', () => {
  beforeAll(async () => {
    // テスト用ユーザーを作成
    const passwordHash1 = await argon2.hash(testUser1.password, {
      type: argon2.argon2id,
    });
    const user1 = await prisma.user.create({
      data: {
        email: testUser1.email,
        passwordHash: passwordHash1,
        name: testUser1.name,
        emailVerified: new Date(),
      },
    });
    testUserId1 = user1.id;

    const passwordHash2 = await argon2.hash(testUser2.password, {
      type: argon2.argon2id,
    });
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
    const loginResponse1 = await request(app)
      .post('/auth/login')
      .send({
        email: testUser1.email,
        password: testUser1.password,
      })
      .set('Content-Type', 'application/json');
    authCookie1 = loginResponse1.headers['set-cookie']?.[0] || '';

    await request(app)
      .post('/auth/login')
      .send({
        email: testUser2.email,
        password: testUser2.password,
      })
      .set('Content-Type', 'application/json');
    // authCookie2 = loginResponse2.headers['set-cookie']?.[0] || '';

    // テスト用の旅程を作成
    const itinerary1 = await prisma.itinerary.create({
      data: {
        id: 'copy_test_itinerary_1',
        data: JSON.stringify({
          title: '複製テスト旅程1',
          days: [],
        }),
        userId: testUserId1,
      },
    });
    testItineraryId1 = itinerary1.id;

    const itinerary2 = await prisma.itinerary.create({
      data: {
        id: 'copy_test_itinerary_2',
        data: JSON.stringify({
          title: '複製テスト旅程2',
          days: [],
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
          in: [testItineraryId1, testItineraryId2],
        },
      },
    });
    await prisma.itinerary.deleteMany({
      where: {
        id: {
          in: [testItineraryId1, testItineraryId2],
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [testUserId1, testUserId2],
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/itineraries/copy/{id}', () => {
    test('認証済みユーザーがPUBLIC_LINK旅程を複製できる', async () => {
      // PUBLIC_LINK共有設定を作成
      await prisma.itineraryShare.create({
        data: {
          itineraryId: testItineraryId2,
          permission: 'READ_ONLY',
          scope: 'PUBLIC_LINK',
        },
      });

      const response = await request(app)
        .post(`/api/itineraries/copy/${testItineraryId2}`)
        .set('Cookie', authCookie1);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty(
        'message',
        'Itinerary copied successfully'
      );

      // 複製された旅程をクリーンアップ
      await prisma.itinerary.delete({
        where: { id: response.body.id },
      });
    });

    test('認証済みユーザーがPUBLIC旅程を複製できる', async () => {
      // PUBLIC共有設定に変更
      await prisma.itineraryShare.update({
        where: { itineraryId: testItineraryId2 },
        data: { scope: 'PUBLIC' },
      });

      const response = await request(app)
        .post(`/api/itineraries/copy/${testItineraryId2}`)
        .set('Cookie', authCookie1);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty(
        'message',
        'Itinerary copied successfully'
      );

      // 複製された旅程をクリーンアップ
      await prisma.itinerary.delete({
        where: { id: response.body.id },
      });
    });

    test('自分の旅程を複製できない', async () => {
      const response = await request(app)
        .post(`/api/itineraries/copy/${testItineraryId1}`)
        .set('Cookie', authCookie1);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('PRIVATE旅程を複製できない', async () => {
      // PRIVATE共有設定に変更
      await prisma.itineraryShare.update({
        where: { itineraryId: testItineraryId2 },
        data: { scope: 'PRIVATE' },
      });

      const response = await request(app)
        .post(`/api/itineraries/copy/${testItineraryId2}`)
        .set('Cookie', authCookie1);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'forbidden');
    });

    test('認証されていない場合にエラーを返す', async () => {
      const response = await request(app).post(
        `/api/itineraries/copy/${testItineraryId2}`
      );

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'unauthorized');
    });

    test('存在しない旅程を複製できない', async () => {
      const response = await request(app)
        .post('/api/itineraries/copy/nonexistent')
        .set('Cookie', authCookie1);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'not_found');
    });

    test('期限切れの共有設定の旅程を複製できない', async () => {
      // 期限切れの共有設定に変更
      await prisma.itineraryShare.update({
        where: { itineraryId: testItineraryId2 },
        data: {
          scope: 'PUBLIC_LINK',
          expiresAt: new Date(Date.now() - 1000), // 1秒前（期限切れ）
        },
      });

      const response = await request(app)
        .post(`/api/itineraries/copy/${testItineraryId2}`)
        .set('Cookie', authCookie1);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'forbidden');
    });
  });

  describe('POST /api/itineraries/migrate', () => {
    test('認証済みユーザーがローカル旅程を移行できる', async () => {
      const migrateData = {
        itineraries: [
          {
            id: 'local_migrate_1',
            data: {
              title: '移行テスト旅程1',
              days: [],
            },
          },
          {
            id: 'local_migrate_2',
            data: {
              title: '移行テスト旅程2',
              days: [],
            },
          },
        ],
      };

      const response = await request(app)
        .post('/api/itineraries/migrate')
        .send(migrateData)
        .set('Cookie', authCookie1)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('migrated', 2);
      expect(response.body).toHaveProperty('total', 2);
      expect(response.body).toHaveProperty('message');

      // 移行された旅程をクリーンアップ
      const itineraries = await prisma.itinerary.findMany({
        where: {
          userId: testUserId1,
          data: {
            contains: '移行テスト旅程',
          },
        },
      });
      await prisma.itinerary.deleteMany({
        where: {
          id: {
            in: itineraries.map((i) => i.id),
          },
        },
      });
    });

    test('空の配列で移行できない', async () => {
      const migrateData = {
        itineraries: [],
      };

      const response = await request(app)
        .post('/api/itineraries/migrate')
        .send(migrateData)
        .set('Cookie', authCookie1)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid_body');
      expect(response.body.message).toBe('Request validation failed');
    });

    test('最大件数を超える旅程を移行できない', async () => {
      const itineraries = Array.from({ length: 51 }, (_, i) => ({
        id: `local_max_${i}`,
        data: {
          title: `最大件数テスト${i}`,
          days: [],
        },
      }));

      const migrateData = { itineraries };

      const response = await request(app)
        .post('/api/itineraries/migrate')
        .send(migrateData)
        .set('Cookie', authCookie1)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'bad_request');
      expect(response.body.message).toBe(
        'Too many itineraries. Maximum 50 allowed'
      );
    });

    test('認証されていない場合にエラーを返す', async () => {
      const migrateData = {
        itineraries: [
          {
            id: 'local_123',
            data: { title: 'テスト', days: [] },
          },
        ],
      };

      const response = await request(app)
        .post('/api/itineraries/migrate')
        .send(migrateData)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'unauthorized');
    });

    test('必須フィールドが不足している場合にエラーを返す', async () => {
      const migrateData = {
        itineraries: [
          {
            // idが不足
            data: { title: 'テスト', days: [] },
          },
        ],
      };

      const response = await request(app)
        .post('/api/itineraries/migrate')
        .send(migrateData)
        .set('Cookie', authCookie1)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid_body');
      expect(response.body.message).toBe('Request validation failed');
    });
  });
});
