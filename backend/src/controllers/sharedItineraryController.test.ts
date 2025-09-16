import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";


import { testPrisma as prisma } from '../config/prisma.test';

// テスト用のユーザーデータ
const testUser = {
  email: 'shared-test@example.com',
  password: 'TestPassword123!',
  name: '共有テストユーザー',
};

let testUserId: string;
let testItineraryId: string;
let authCookie: string;

/**
 * 共有旅程アクセスAPIのテスト
 */
describe('Shared Itinerary Access API Tests', () => {
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

    // ログインしてCookieを取得
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      })
      .set('Content-Type', 'application/json');
    authCookie = loginResponse.headers['set-cookie']?.[0] || '';

    // テスト用の旅程を作成
    const itinerary = await prisma.itinerary.create({
      data: {
        id: 'shared_test_itinerary',
        data: JSON.stringify({
          title: '共有テスト旅程',
          days: []
        }),
        userId: testUserId,
      },
    });
    testItineraryId = itinerary.id;
  });

  afterAll(async () => {
    // テストデータをクリーンアップ
    await prisma.itineraryShare.deleteMany({
      where: { itineraryId: testItineraryId }
    });
    await prisma.itinerary.delete({
      where: { id: testItineraryId }
    });
    await prisma.user.delete({
      where: { id: testUserId }
    });
    await prisma.$disconnect();
  });


  describe('GET /shared/{id}', () => {
    test('PUBLIC_LINK旅程を取得できる（認証不要）', async () => {
      // PUBLIC_LINK共有設定を作成
      await prisma.itineraryShare.create({
        data: {
          itineraryId: testItineraryId,
          permission: 'READ_ONLY',
          scope: 'PUBLIC_LINK',
        },
      });

      const response = await request(app)
        .get(`/shared/${testItineraryId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('title', '共有テスト旅程');
      expect(response.body).toHaveProperty('_shareInfo');
      expect(response.body._shareInfo).toHaveProperty('scope', 'PUBLIC_LINK');
      expect(response.body._shareInfo).toHaveProperty('permission', 'READ_ONLY');
      expect(response.body._shareInfo).toHaveProperty('isReadOnly', true);
    });

    test('PRIVATE旅程にアクセスできない', async () => {
      // 既存の共有設定を削除
      await prisma.itineraryShare.deleteMany({
        where: { itineraryId: testItineraryId }
      });

      // PRIVATE共有設定を作成
      await prisma.itineraryShare.create({
        data: {
          itineraryId: testItineraryId,
          permission: 'READ_ONLY',
          scope: 'PRIVATE',
        },
      });

      const response = await request(app)
        .get(`/shared/${testItineraryId}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'forbidden');
    });

    test('存在しない旅程にアクセスできない', async () => {
      const response = await request(app)
        .get('/shared/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'not_found');
    });

    test('期限切れの共有設定にアクセスできない', async () => {
      // 期限切れの共有設定を作成
      await prisma.itineraryShare.deleteMany({
        where: { itineraryId: testItineraryId }
      });

      await prisma.itineraryShare.create({
        data: {
          itineraryId: testItineraryId,
          permission: 'READ_ONLY',
          scope: 'PUBLIC_LINK',
          expiresAt: new Date(Date.now() - 1000), // 1秒前（期限切れ）
        },
      });

      const response = await request(app)
        .get(`/shared/${testItineraryId}`);

      expect(response.status).toBe(410);
      expect(response.body).toHaveProperty('error', 'gone');
      expect(response.body).toHaveProperty('message', 'Share has expired');
    });
  });

  describe('GET /public/{id}', () => {
    test('PUBLIC旅程を取得できる（認証不要）', async () => {
      // PUBLIC共有設定を作成
      await prisma.itineraryShare.deleteMany({
        where: { itineraryId: testItineraryId }
      });

      await prisma.itineraryShare.create({
        data: {
          itineraryId: testItineraryId,
          permission: 'READ_ONLY',
          scope: 'PUBLIC',
        },
      });

      const response = await request(app)
        .get(`/public/${testItineraryId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('title', '共有テスト旅程');
      expect(response.body).toHaveProperty('_publicInfo');
      expect(response.body._publicInfo).toHaveProperty('scope', 'PUBLIC');
      expect(response.body._publicInfo).toHaveProperty('permission', 'READ_ONLY');
      expect(response.body._publicInfo).toHaveProperty('isReadOnly', true);
      expect(response.body._publicInfo).toHaveProperty('ogp');
      expect(response.body._publicInfo.ogp).toHaveProperty('title');
      expect(response.body._publicInfo.ogp).toHaveProperty('description');
      expect(response.body._publicInfo.ogp).toHaveProperty('url');
    });

    test('PUBLIC_LINK旅程にアクセスできない', async () => {
      // PUBLIC_LINK共有設定に変更
      await prisma.itineraryShare.update({
        where: { itineraryId: testItineraryId },
        data: { scope: 'PUBLIC_LINK' }
      });

      const response = await request(app)
        .get(`/public/${testItineraryId}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'forbidden');
    });

    test('存在しない旅程にアクセスできない', async () => {
      const response = await request(app)
        .get('/public/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'not_found');
    });
  });
});
