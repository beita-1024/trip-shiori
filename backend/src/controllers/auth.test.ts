import request from 'supertest';
import app from '../app';
import argon2 from 'argon2';
import crypto from 'crypto';
import {
  describe,
  test,
  expect,
  afterAll,
  beforeEach,
  jest,
} from '@jest/globals';

import { testPrisma as prisma } from '../config/prisma.test';

// メール送信をモック化
jest.mock('../utils/email', () => ({
  sendEmailWithTemplate: jest.fn<any>().mockResolvedValue({
    messageId: 'mock-message-id',
    accepted: ['test@example.com'],
    rejected: [],
    pending: [],
    response: '250 OK',
  }),
  createVerificationEmailTemplate: jest.fn(
    (userName: string, verificationUrl: string) => ({
      subject: 'アカウント確認のお願い',
      html: `<p>こんにちは、${userName}さん</p><p><a href="${verificationUrl}">アカウントを確認する</a></p>`,
      text: `こんにちは、${userName}さん\nアカウントを確認する: ${verificationUrl}`,
    })
  ),
  createPasswordResetEmailTemplate: jest.fn(
    (userName: string, resetUrl: string) => ({
      subject: 'パスワードリセットのお願い',
      html: `<p>こんにちは、${userName}さん</p><p><a href="${resetUrl}">パスワードをリセットする</a></p>`,
      text: `こんにちは、${userName}さん\nパスワードをリセットする: ${resetUrl}`,
    })
  ),
}));

// 参考
// Jest公式サイト: https://jestjs.io/docs/getting-started
// Supertest公式: https://github.com/visionmedia/supertest
// supertest でREST APIの試験を行う:
// https://qiita.com/mikakane/items/5ee9503ca04f1a719aa3

/**
 * 認証エンドポイントのテスト
 *
 * 各認証エンドポイントの正常系・異常系をテストします。
 */
describe('Auth Endpoints Tests', () => {
  // テスト用のユーザーデータ
  const testUser = {
    email: 'auth-endpoint-test@example.com',
    password: 'TestPassword123!',
    name: 'Test User',
  };

  const testUser2 = {
    email: 'auth-endpoint-test2@example.com',
    password: 'TestPassword123!',
    name: 'Test User 2',
  };

  // テスト前後のクリーンアップ
  beforeEach(async () => {
    // テスト用データのクリーンアップ
    await prisma.emailVerificationToken.deleteMany({});
    await prisma.passwordResetToken.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [testUser.email, testUser2.email],
        },
      },
    });
  });

  afterAll(async () => {
    // 最終クリーンアップ
    await prisma.emailVerificationToken.deleteMany({});
    await prisma.passwordResetToken.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [testUser.email, testUser2.email],
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('POST /auth/register', () => {
    test('正常なユーザー登録が成功する', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send(testUser)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});

      // データベースにユーザーが作成されているか確認
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });
      expect(user).toBeTruthy();
      expect(user?.email).toBe(testUser.email);
      expect(user?.name).toBe(testUser.name);
      expect(user?.emailVerified).toBeNull();
    });

    test('メールアドレスが重複している場合にエラーを返す', async () => {
      // 最初のユーザーを登録
      await request(app)
        .post('/auth/register')
        .send(testUser)
        .set('Content-Type', 'application/json');

      // ユーザーを認証済みにする
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
      }

      // 同じメールアドレスで再度登録を試行
      const response = await request(app)
        .post('/auth/register')
        .send(testUser)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error', 'already_exists');
      expect(response.body).toHaveProperty('message');
    }, 10000);

    test('必須フィールドが不足している場合にエラーを返す', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ email: testUser.email })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid_body');
      expect(response.body).toHaveProperty('message');
    });

    test('無効なメール形式の場合にエラーを返す', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: testUser.password,
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid_body');
      expect(response.body).toHaveProperty('message');
    });

    test('パスワード強度が不足している場合にエラーを返す', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: testUser.email,
          password: 'weak',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid_body');
      expect(response.body).toHaveProperty('message');
    });

    test('名前が不足している場合にエラーを返す', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid_body');
      expect(response.body).toHaveProperty('message');
    });

    test('名前が空文字列の場合にエラーを返す', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password,
          name: '',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid_body');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /auth/verify-email', () => {
    let verificationToken: string;
    let userId: string;

    beforeEach(async () => {
      // テスト用ユーザーを作成
      const passwordHash = await argon2.hash(testUser.password);
      const user = await prisma.user.create({
        data: {
          email: testUser.email,
          passwordHash,
          name: testUser.name,
          emailVerified: null,
        },
      });
      userId = user.id;

      // 検証トークンを作成
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = await argon2.hash(rawToken);

      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30分後
        },
      });

      verificationToken = rawToken;
    });

    test('正常なメール認証が成功する', async () => {
      const response = await request(app).get(
        `/auth/verify-email?uid=${userId}&token=${verificationToken}`
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty(
        'message',
        'Email verification successful'
      );

      // Cookieが設定されているか確認
      const cookies = response.headers['set-cookie'] as unknown as
        | string[]
        | undefined;
      expect(cookies).toBeTruthy();
      expect(
        cookies?.some((cookie: string) => cookie.includes('access_token'))
      ).toBe(true);

      // ユーザーが認証済みになっているか確認
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      expect(user?.emailVerified).toBeTruthy();

      // 検証トークンが削除されているか確認
      const token = await prisma.emailVerificationToken.findFirst({
        where: { userId },
      });
      expect(token).toBeNull();
    });

    test('無効なトークンの場合にエラーを返す', async () => {
      const response = await request(app).get(
        `/auth/verify-email?uid=${userId}&token=invalid-token`
      );

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid_token');
    });

    test('必須パラメータが不足している場合にエラーを返す', async () => {
      const response = await request(app).get('/auth/verify-email?uid=test');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid_body');
      expect(response.body).toHaveProperty('message', 'Validation failed');
    });
  });

  describe('POST /auth/login', () => {
    // let userId: string;

    beforeEach(async () => {
      // 認証済みユーザーを作成
      const passwordHash = await argon2.hash(testUser.password);
      await prisma.user.create({
        data: {
          email: testUser.email,
          passwordHash,
          name: testUser.name,
          emailVerified: new Date(), // 認証済み
        },
      });
      // userId = user.id;
    });

    test('正常なログインが成功する', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});

      // Cookieが設定されているか確認
      const cookies = response.headers['set-cookie'] as unknown as
        | string[]
        | undefined;
      expect(cookies).toBeTruthy();
      expect(
        cookies?.some((cookie: string) => cookie.includes('access_token'))
      ).toBe(true);
    });

    test('存在しないユーザーの場合にエラーを返す', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password,
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'unauthorized');
    });

    test('間違ったパスワードの場合にエラーを返す', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'unauthorized');
    });

    test('メール未認証ユーザーの場合にエラーを返す', async () => {
      // 未認証ユーザーを作成
      const passwordHash = await argon2.hash(testUser2.password);
      await prisma.user.create({
        data: {
          email: testUser2.email,
          passwordHash,
          name: testUser2.name,
          emailVerified: null, // 未認証
        },
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: testUser2.email,
          password: testUser2.password,
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'forbidden');
    });

    test('必須フィールドが不足している場合にエラーを返す', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: testUser.email })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid_body');
    });
  });

  describe('POST /auth/logout', () => {
    let authCookie: string;

    beforeEach(async () => {
      // 認証済みユーザーを作成してログイン
      const passwordHash = await argon2.hash(testUser.password);
      await prisma.user.create({
        data: {
          email: testUser.email,
          passwordHash,
          name: testUser.name,
          emailVerified: new Date(),
        },
      });

      // ログインしてCookieを取得
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .set('Content-Type', 'application/json');

      authCookie = loginResponse.headers['set-cookie']?.[0] || '';
    });

    test('正常なログアウトが成功する', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Cookie', authCookie);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});

      // Cookieがクリアされているか確認
      const cookies = response.headers['set-cookie'] as unknown as
        | string[]
        | undefined;
      expect(cookies).toBeTruthy();
      expect(
        cookies?.some((cookie: string) => cookie.includes('access_token=;'))
      ).toBe(true);
    });

    test('認証されていない場合にエラーを返す', async () => {
      const response = await request(app).post('/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'unauthorized');
    });
  });

  describe('GET /auth/protected', () => {
    let authCookie: string;

    beforeEach(async () => {
      // 認証済みユーザーを作成してログイン
      const passwordHash = await argon2.hash(testUser.password);
      await prisma.user.create({
        data: {
          email: testUser.email,
          passwordHash,
          name: testUser.name,
          emailVerified: new Date(),
        },
      });

      // ログインしてCookieを取得
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .set('Content-Type', 'application/json');

      authCookie = loginResponse.headers['set-cookie']?.[0] || '';
    });

    test('認証済みユーザーが保護されたリソースにアクセスできる', async () => {
      const response = await request(app)
        .get('/auth/protected')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body).toHaveProperty(
        'message',
        'This is a protected resource'
      );
    });

    test('認証されていない場合にエラーを返す', async () => {
      const response = await request(app).get('/auth/protected');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'unauthorized');
    });
  });

  describe('ユーザー管理API', () => {
    let authCookie: string;
    let userId: string;

    beforeEach(async () => {
      // 認証済みユーザーを作成してログイン
      const passwordHash = await argon2.hash(testUser.password);
      const user = await prisma.user.create({
        data: {
          email: testUser.email,
          passwordHash,
          name: testUser.name,
          emailVerified: new Date(),
        },
      });
      userId = user.id;

      // ログインしてCookieを取得
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .set('Content-Type', 'application/json');

      authCookie = loginResponse.headers['set-cookie']?.[0] || '';
    });

    describe('GET /api/users/profile', () => {
      test('認証済みユーザーがプロフィールを取得できる', async () => {
        const response = await request(app)
          .get('/api/users/profile')
          .set('Cookie', authCookie);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', userId);
        expect(response.body).toHaveProperty('email', testUser.email);
        expect(response.body).toHaveProperty('name', testUser.name);
        expect(response.body).toHaveProperty('emailVerified');
        expect(response.body).toHaveProperty('createdAt');
        expect(response.body).toHaveProperty('updatedAt');
      });

      test('認証されていない場合にエラーを返す', async () => {
        const response = await request(app).get('/api/users/profile');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'unauthorized');
      });
    });

    describe('PUT /api/users/profile', () => {
      test('認証済みユーザーがプロフィールを更新できる', async () => {
        const updateData = {
          name: '更新された名前',
        };

        const response = await request(app)
          .put('/api/users/profile')
          .send(updateData)
          .set('Cookie', authCookie)
          .set('Content-Type', 'application/json');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', userId);
        expect(response.body).toHaveProperty('email', testUser.email);
        expect(response.body).toHaveProperty('name', '更新された名前');
      });

      test('認証されていない場合にエラーを返す', async () => {
        const updateData = {
          name: '更新された名前',
        };

        const response = await request(app)
          .put('/api/users/profile')
          .send(updateData)
          .set('Content-Type', 'application/json');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'unauthorized');
      });
    });

    describe('PUT /api/users/password', () => {
      test('認証済みユーザーがパスワードを変更できる', async () => {
        const passwordData = {
          currentPassword: testUser.password,
          newPassword: 'NewPassword123!',
        };

        const response = await request(app)
          .put('/api/users/password')
          .send(passwordData)
          .set('Cookie', authCookie)
          .set('Content-Type', 'application/json');

        expect(response.status).toBe(204);
      });

      test('間違った現在のパスワードでエラーを返す', async () => {
        const passwordData = {
          currentPassword: 'wrongpassword',
          newPassword: 'NewPassword123!',
        };

        const response = await request(app)
          .put('/api/users/password')
          .send(passwordData)
          .set('Cookie', authCookie)
          .set('Content-Type', 'application/json');

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty(
          'error',
          'invalid_current_password'
        );
      });

      test('認証されていない場合にエラーを返す', async () => {
        const passwordData = {
          currentPassword: testUser.password,
          newPassword: 'NewPassword123!',
        };

        const response = await request(app)
          .put('/api/users/password')
          .send(passwordData)
          .set('Content-Type', 'application/json');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'unauthorized');
      });
    });

    describe('POST /api/users/account/delete', () => {
      test('認証済みユーザーがアカウントを削除できる', async () => {
        const deleteData = {
          password: testUser.password,
        };

        const response = await request(app)
          .post('/api/users/account/delete')
          .send(deleteData)
          .set('Cookie', authCookie)
          .set('Content-Type', 'application/json');

        expect(response.status).toBe(204);

        // ユーザーが削除されていることを確認
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });
        expect(user).toBeNull();
      });

      test('間違ったパスワードでエラーを返す', async () => {
        const deleteData = {
          password: 'WrongPassword123!',
        };

        const response = await request(app)
          .post('/api/users/account/delete')
          .send(deleteData)
          .set('Cookie', authCookie)
          .set('Content-Type', 'application/json');

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'invalid_password');
      });

      test('認証されていない場合にエラーを返す', async () => {
        const deleteData = {
          password: testUser.password,
        };

        const response = await request(app)
          .post('/api/users/account/delete')
          .send(deleteData)
          .set('Content-Type', 'application/json');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'unauthorized');
      });
    });
  });
});
