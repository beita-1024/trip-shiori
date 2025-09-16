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

// テスト用のユーザーデータ
const testUser = {
  email: 'auth-test@example.com',
  password: 'TestPassword123!',
  name: 'テストユーザー',
};

// テスト用のパスワードリセットトークン
let testResetToken: string;
let testUserId: string;

/**
 * パスワードリセット機能のテスト
 */
describe('Password Reset Tests', () => {
  beforeAll(async () => {
    // メール送信のモックを設定
    const {
      sendEmailWithTemplate,
      createVerificationEmailTemplate,
      createPasswordResetEmailTemplate,
    } = require('../utils/email'); // eslint-disable-line @typescript-eslint/no-require-imports
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
    await prisma.passwordResetToken.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
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

      // 最初のトークンを取得（少し待機してから検索）
      await new Promise((resolve) => setTimeout(resolve, 100));
      const firstToken = await prisma.passwordResetToken.findUnique({
        where: { userId: testUserId },
      });
      expect(firstToken).toBeTruthy();
      const firstTokenHash = firstToken?.tokenHash;
      const firstCreatedAt = firstToken?.createdAt;

      // 2回目のリクエスト
      const response2 = await request(app)
        .post('/auth/password-reset/request')
        .send({ email: testUser.email })
        .set('Content-Type', 'application/json');

      expect(response2.status).toBe(204);

      // トークンが更新されていることを確認（少し待機してから検索）
      await new Promise((resolve) => setTimeout(resolve, 100));
      const secondToken = await prisma.passwordResetToken.findUnique({
        where: { userId: testUserId },
      });
      expect(secondToken).toBeTruthy();
      expect(secondToken?.tokenHash).not.toBe(firstTokenHash);
      expect(secondToken?.createdAt.getTime()).toBeGreaterThan(
        firstCreatedAt?.getTime() || 0
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
          (detail: any) =>
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
        delete (decodedToken as any).iat;
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
        expect((decodedInvalidToken as any).iat).toBeUndefined();
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
});
