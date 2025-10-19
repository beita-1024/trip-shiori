import request from 'supertest';
import app from '../app';
import argon2 from 'argon2';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';

// メール送信をモック
jest.mock('../utils/email', () => ({
  sendEmailWithTemplate: jest.fn(),
  createVerificationEmailTemplate: jest.fn(),
  createPasswordResetEmailTemplate: jest.fn(),
}));

import { testPrisma as prisma } from '../config/prisma.test';

// テスト用のユーザーデータ（ユニークなメールアドレスを生成）
const generateTestUser = () => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return {
    email: `auth-test-${timestamp}-${randomSuffix}@example.com`,
    password: 'TestPassword123!',
    name: 'テストユーザー',
  };
};

const testUser = generateTestUser();

// テスト用のパスワードリセットトークン
let testResetToken: string;
let testUserId: string;

/**
 * パスワードリセット機能のテスト
 */
describe('Password Reset Tests', () => {
  beforeAll(async () => {
    // 環境変数を設定
    process.env.REFRESH_TOKEN_FINGERPRINT_SECRET =
      'test-fingerprint-secret-32chars-long';

    // メール送信のモックを設定
    const {
      sendEmailWithTemplate,
      createVerificationEmailTemplate,
      createPasswordResetEmailTemplate,
    } = require('../utils/email');
    sendEmailWithTemplate.mockResolvedValue({ messageId: 'test-message-id' });
    createVerificationEmailTemplate.mockReturnValue({
      subject: 'Test Subject',
      html: '<p>Test HTML</p>',
      text: 'Test Text',
    });
    createPasswordResetEmailTemplate.mockReturnValue({
      subject: 'Test Subject',
      html: '<p>Test HTML</p>',
      text: 'Test Text',
    });

    // 既存のテストユーザーを削除（重複を防ぐため）
    await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: 'auth-test-',
        },
      },
    });

    // テスト用ユーザーを作成
    const passwordHash = await argon2.hash(testUser.password, {
      type: argon2.argon2id,
    });
    const user = await prisma.user.create({
      data: {
        email: testUser.email,
        passwordHash,
        name: testUser.name,
        emailVerified: new Date(),
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // テストデータをクリーンアップ
    if (testUserId) {
      await prisma.passwordResetToken.deleteMany({
        where: { userId: testUserId },
      });
      await prisma.user.delete({
        where: { id: testUserId },
      });
    }

    // 念のため、テスト用メールアドレスで始まるユーザーをすべて削除
    await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: 'auth-test-',
        },
      },
    });

    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // 各テスト前にパスワードリセットトークンをクリーンアップ
    await prisma.passwordResetToken.deleteMany({
      where: { userId: testUserId },
    });
  });

  afterEach(async () => {
    // 各テスト後にパスワードリセットトークンをクリーンアップ
    await prisma.passwordResetToken.deleteMany({
      where: { userId: testUserId },
    });
  });

  describe('POST /auth/password-reset/request', () => {
    test('有効なメールアドレスでパスワードリセットリクエストが成功する', async () => {
      const response = await request(app)
        .post('/auth/password-reset/request')
        .send({ email: testUser.email })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(204);

      // パスワードリセットトークンが作成されていることを確認
      const resetToken = await prisma.passwordResetToken.findFirst({
        where: { userId: testUserId },
      });
      expect(resetToken).toBeTruthy();
      expect(resetToken?.expiresAt).toBeInstanceOf(Date);
    });

    test('存在しないメールアドレスでも同じレスポンスを返す（セキュリティ対策）', async () => {
      const response = await request(app)
        .post('/auth/password-reset/request')
        .send({ email: 'nonexistent@example.com' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(204);
    });

    test('メールアドレスが未提供の場合にエラーを返す', async () => {
      const response = await request(app)
        .post('/auth/password-reset/request')
        .send({})
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_body');
      expect(response.body.message).toBe('Validation failed');
    });

    test('無効なメール形式の場合にエラーを返す', async () => {
      const response = await request(app)
        .post('/auth/password-reset/request')
        .send({ email: 'invalid-email' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_body');
      expect(response.body.message).toBe('Validation failed');
    });

    test('複数回のリクエストでトークンが上書きされる（upsert動作確認）', async () => {
      // 1回目のリクエスト
      const response1 = await request(app)
        .post('/auth/password-reset/request')
        .send({ email: testUser.email })
        .set('Content-Type', 'application/json');

      expect(response1.status).toBe(204);

      // 最初のトークンを取得
      const firstToken = await prisma.passwordResetToken.findUnique({
        where: { userId: testUserId },
      });
      expect(firstToken).toBeTruthy();
      const firstTokenHash = firstToken?.tokenHash;
      const firstExpiresAt = firstToken?.expiresAt;

      // 少し待機してから2回目のリクエスト（時間差を明確にする）
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 2回目のリクエスト
      const response2 = await request(app)
        .post('/auth/password-reset/request')
        .send({ email: testUser.email })
        .set('Content-Type', 'application/json');

      expect(response2.status).toBe(204);

      // トークンが更新されていることを確認
      const secondToken = await prisma.passwordResetToken.findUnique({
        where: { userId: testUserId },
      });

      expect(secondToken).toBeTruthy();
      expect(secondToken?.tokenHash).not.toBe(firstTokenHash);
      expect(secondToken?.expiresAt.getTime()).toBeGreaterThan(
        firstExpiresAt?.getTime() || 0
      );
    });
  });

  describe('POST /auth/password-reset/confirm', () => {
    beforeEach(async () => {
      // 既存のパスワードリセットトークンを削除（@@unique([userId])制約のため）
      await prisma.passwordResetToken.deleteMany({
        where: { userId: testUserId },
      });

      // テスト用のパスワードリセットトークンを作成
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = await argon2.hash(rawToken, { type: argon2.argon2id });

      // ユーザーが存在することを確認してからトークンを作成
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
      });

      if (user) {
        await prisma.passwordResetToken.create({
          data: {
            userId: testUserId,
            tokenHash,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15分後
          },
        });
      }

      testResetToken = rawToken;
    });

    afterEach(async () => {
      // テスト用のパスワードリセットトークンを削除
      await prisma.passwordResetToken.deleteMany({
        where: { userId: testUserId },
      });
    });

    test('有効なトークンでパスワードリセットが成功する', async () => {
      const newPassword = 'NewPassword123!';

      const response = await request(app)
        .post('/auth/password-reset/confirm')
        .send({
          uid: testUserId,
          token: testResetToken,
          newPassword,
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(204);

      // パスワードリセットトークンが削除されていることを確認
      const resetToken = await prisma.passwordResetToken.findFirst({
        where: { userId: testUserId },
      });
      expect(resetToken).toBeNull();

      // ユーザーのパスワードが更新されていることを確認
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      expect(user?.passwordChangedAt).toBeInstanceOf(Date);
    });

    test('無効なトークンでエラーを返す', async () => {
      const response = await request(app)
        .post('/auth/password-reset/confirm')
        .send({
          uid: testUserId,
          token: 'invalid-token',
          newPassword: 'NewPassword123!',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_token');
    });

    test('期限切れトークンでエラーを返す', async () => {
      // 既存のトークンを削除してから期限切れトークンを作成
      await prisma.passwordResetToken.deleteMany({
        where: { userId: testUserId },
      });

      // 期限切れのトークンを作成
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = await argon2.hash(rawToken, { type: argon2.argon2id });

      // ユーザーが存在することを確認してからトークンを作成
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
      });

      if (user) {
        await prisma.passwordResetToken.create({
          data: {
            userId: testUserId,
            tokenHash,
            expiresAt: new Date(Date.now() - 1000), // 1秒前（期限切れ）
          },
        });
      }

      const response = await request(app)
        .post('/auth/password-reset/confirm')
        .send({
          uid: testUserId,
          token: rawToken,
          newPassword: 'NewPassword123!',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_token');
    });

    test('必須パラメータが不足している場合にエラーを返す', async () => {
      const response = await request(app)
        .post('/auth/password-reset/confirm')
        .send({
          uid: testUserId,
          // token と newPassword が不足
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_body');
      expect(response.body.message).toBe('Validation failed');
    });

    test('パスワード強度が不十分な場合にエラーを返す', async () => {
      const response = await request(app)
        .post('/auth/password-reset/confirm')
        .send({
          uid: testUserId,
          token: testResetToken,
          newPassword: 'weak', // 弱いパスワード
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_body');
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
      expect(
        response.body.details.some(
          (detail: { field: string; message: string }) =>
            detail.field === 'newPassword' &&
            detail.message.includes('8文字以上')
        )
      ).toBe(true);
    });
  });

  describe('JWT Token Invalidation', () => {
    beforeEach(async () => {
      // テスト前にユーザーのパスワードを元に戻す
      const passwordHash = await argon2.hash(testUser.password, {
        type: argon2.argon2id,
      });
      await prisma.user.update({
        where: { id: testUserId },
        data: {
          passwordHash,
          passwordChangedAt: null, // パスワード変更日時をリセット
        },
      });
    });

    test('パスワードリセット後にJWTトークンが無効化される', async () => {
      // まずログインしてJWTトークンを取得
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .set('Content-Type', 'application/json');

      expect(loginResponse.status).toBe(204);
      const cookies = loginResponse.headers['set-cookie'];
      expect(cookies).toBeTruthy();

      // 既存のパスワードリセットトークンを削除してから新しいトークンを作成
      await prisma.passwordResetToken.deleteMany({
        where: { userId: testUserId },
      });

      // パスワードリセットトークンを作成
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = await argon2.hash(rawToken, { type: argon2.argon2id });

      // ユーザーが存在することを確認してからトークンを作成
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
      });

      expect(user).toBeTruthy();

      const resetToken = await prisma.passwordResetToken.create({
        data: {
          userId: testUserId,
          tokenHash,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      expect(resetToken).toBeTruthy();

      // パスワードリセットを実行
      const resetResponse = await request(app)
        .post('/auth/password-reset/confirm')
        .send({
          uid: testUserId,
          token: rawToken,
          newPassword: 'NewPassword123!',
        })
        .set('Content-Type', 'application/json');

      expect(resetResponse.status).toBe(204);

      // パスワード変更日時が設定されていることを確認
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      expect(updatedUser?.passwordChangedAt).toBeTruthy();

      // 古いJWTトークンで保護されたリソースにアクセス（失敗するはず）
      const protectedResponse = await request(app)
        .get('/auth/protected')
        .set('Cookie', cookies);

      expect(protectedResponse.status).toBe(401);
      expect(protectedResponse.body.message).toContain(
        'Token invalidated due to password change'
      );
    });

    test('iatフィールドが無いJWTトークンは無効として扱われる', async () => {
      // まずログインしてJWTトークンを取得
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .set('Content-Type', 'application/json');

      expect(loginResponse.status).toBe(204);
      const cookies = loginResponse.headers['set-cookie'];
      expect(cookies).toBeTruthy();

      // iatフィールドを削除した無効なトークンを作成
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const decodedToken = jwt.decode(cookies[0].split('=')[1].split(';')[0]);

      // デコードされたトークンが有効であることを確認
      expect(decodedToken).toBeTruthy();
      expect(typeof decodedToken).toBe('object');

      // iatフィールドを削除
      if (
        decodedToken &&
        typeof decodedToken === 'object' &&
        'iat' in decodedToken
      ) {
        delete (decodedToken as Record<string, unknown>).iat;
      }

      // 無効なトークンを再署名（iatフィールドを明示的に除外）
      const invalidToken = jwt.sign(decodedToken as object, secret, {
        algorithm: 'HS256',
        noTimestamp: true, // iatフィールドを追加しない
      });

      // デバッグ: 作成したトークンにiatフィールドが含まれていないことを確認
      const decodedInvalidToken = jwt.decode(invalidToken);
      expect(decodedInvalidToken).toBeTruthy();
      expect(typeof decodedInvalidToken).toBe('object');
      if (decodedInvalidToken && typeof decodedInvalidToken === 'object') {
        expect(
          (decodedInvalidToken as Record<string, unknown>).iat
        ).toBeUndefined();
      }

      // 無効なトークンで保護されたリソースにアクセス（失敗するはず）
      const protectedResponse = await request(app)
        .get('/auth/protected')
        .set('Cookie', `access_token=${invalidToken}`);

      expect(protectedResponse.status).toBe(401);
      expect(protectedResponse.body.message).toContain(
        'Invalid token (missing iat)'
      );
    });
  });

  describe('Refresh Token機能', () => {
    let testUser: { id?: string; email: string; password: string };
    let refreshToken: string;

    beforeEach(async () => {
      // テスト用ユーザーを作成
      testUser = generateTestUser();
      const passwordHash = await argon2.hash(testUser.password, {
        type: argon2.argon2id,
      });

      const user = await prisma.user.create({
        data: {
          email: testUser.email,
          passwordHash,
          emailVerified: new Date(),
        },
      });

      // testUserオブジェクトにidを設定
      testUser.id = user.id;

      // ログインしてRefresh Tokenを取得
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .set('Content-Type', 'application/json');

      expect(loginResponse.status).toBe(204);

      // CookieからRefresh Tokenを抽出
      const cookies = loginResponse.headers['set-cookie'] as unknown as
        | string[]
        | undefined;
      const refreshCookie = cookies?.find((cookie: string) =>
        cookie.startsWith('refresh_token=')
      );
      refreshToken = refreshCookie?.split(';')[0].split('=')[1] || '';
    });

    afterEach(async () => {
      // テストデータをクリーンアップ
      await prisma.refreshToken.deleteMany({
        where: { userId: testUser.id },
      });
      await prisma.user.deleteMany({
        where: { email: testUser.email },
      });
    });

    test('Refresh TokenでAccess Tokenを更新できる', async () => {
      // Refresh Tokenを使用してToken更新
      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${refreshToken}`);

      expect(refreshResponse.status).toBe(204);

      // 新しいCookieが設定されていることを確認
      const cookies = refreshResponse.headers['set-cookie'] as unknown as
        | string[]
        | undefined;
      expect(cookies).toBeDefined();
      expect(
        cookies?.some((cookie: string) => cookie.startsWith('access_token='))
      ).toBe(true);
      expect(
        cookies?.some((cookie: string) => cookie.startsWith('refresh_token='))
      ).toBe(true);
    });

    test('無効なRefresh Tokenで更新を試行すると401エラー', async () => {
      const invalidRefreshToken = 'invalid.refresh.token';

      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${invalidRefreshToken}`);

      expect(refreshResponse.status).toBe(401);
      expect(refreshResponse.body.error).toBe('unauthorized');
      expect(refreshResponse.body.message).toBe(
        'Invalid or expired refresh token'
      );
    });

    test('Refresh Tokenなしで更新を試行すると401エラー', async () => {
      const refreshResponse = await request(app).post('/auth/refresh');

      expect(refreshResponse.status).toBe(401);
      expect(refreshResponse.body.error).toBe('unauthorized');
      expect(refreshResponse.body.message).toBe('Refresh token required');
    });

    test('Refresh Token Rotationが正しく動作する', async () => {
      // 初回のRefresh Token更新
      const firstRefreshResponse = await request(app)
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${refreshToken}`);

      expect(firstRefreshResponse.status).toBe(204);

      // 古いRefresh Tokenで再度更新を試行（失敗するはず）
      const secondRefreshResponse = await request(app)
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${refreshToken}`);

      expect(secondRefreshResponse.status).toBe(401);
      expect(secondRefreshResponse.body.error).toBe('unauthorized');
      expect(secondRefreshResponse.body.message).toBe('Token has been revoked');
    });

    test('ログアウト時に全Refresh Tokenが失効する', async () => {
      // まずAccess Tokenを取得
      const loginResponse = await request(app).post('/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      const cookies = loginResponse.headers['set-cookie'] as unknown as
        | string[]
        | undefined;
      const accessToken =
        cookies
          ?.find((cookie: string) => cookie.startsWith('access_token='))
          ?.split(';')[0]
          .split('=')[1] || '';

      // ログアウト
      const logoutResponse = await request(app)
        .post('/auth/logout')
        .set('Cookie', `access_token=${accessToken}`);

      expect(logoutResponse.status).toBe(204);

      // ログアウト後、Refresh Tokenで更新を試行（失敗するはず）
      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${refreshToken}`);

      expect(refreshResponse.status).toBe(401);
      expect(refreshResponse.body.error).toBe('unauthorized');
    });

    test('パスワード変更時に全Refresh Tokenが失効する', async () => {
      if (!testUser.id) {
        throw new Error('testUser.id is not defined');
      }

      // パスワードリセットトークンを生成
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = await argon2.hash(resetToken, {
        type: argon2.argon2id,
      });

      await prisma.passwordResetToken.create({
        data: {
          userId: testUser.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15分後
        },
      });

      // パスワード変更
      const passwordChangeResponse = await request(app)
        .post('/auth/password-reset/confirm')
        .send({
          uid: testUser.id,
          token: resetToken,
          newPassword: 'NewSecurePass123!',
        });

      expect(passwordChangeResponse.status).toBe(204);

      // パスワード変更後、Refresh Tokenで更新を試行（失敗するはず）
      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${refreshToken}`);

      expect(refreshResponse.status).toBe(401);
      expect(refreshResponse.body.error).toBe('unauthorized');
    });
  });
});
