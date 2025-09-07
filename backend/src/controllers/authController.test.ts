import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import crypto from 'crypto';

const prisma = new PrismaClient();

// テスト用のユーザーデータ
const testUser = {
  email: 'test@example.com',
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
      expect(response.body.message).toContain('Email is required');
    });

    test('無効なメール形式の場合にエラーを返す', async () => {
      const response = await request(app)
        .post('/auth/password-reset/request')
        .send({ email: 'invalid-email' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_body');
      expect(response.body.message).toContain('Invalid email format');
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
      expect(secondToken?.createdAt.getTime()).toBeGreaterThan(firstToken?.createdAt.getTime() || 0);
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
      
      await prisma.passwordResetToken.create({
        data: {
          userId: testUserId,
          tokenHash,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15分後
        },
      });

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
      
      await prisma.passwordResetToken.create({
        data: {
          userId: testUserId,
          tokenHash,
          expiresAt: new Date(Date.now() - 1000), // 1秒前（期限切れ）
        },
      });

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
      expect(response.body.message).toContain('uid, token, and newPassword are required');
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
      expect(response.body.message).toContain('Password does not meet strength requirements');
    });
  });

  describe('JWT Token Invalidation', () => {
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
      
      await prisma.passwordResetToken.create({
        data: {
          userId: testUserId,
          tokenHash,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

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

      // 古いJWTトークンで保護されたリソースにアクセス（失敗するはず）
      const protectedResponse = await request(app)
        .get('/auth/protected')
        .set('Cookie', cookies);

      expect(protectedResponse.status).toBe(401);
      expect(protectedResponse.body.message).toContain('Token invalidated due to password change');
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
      const jwt = require('jsonwebtoken');
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const decodedToken = jwt.decode(cookies[0].split('=')[1].split(';')[0]);
      
      // iatフィールドを削除
      delete decodedToken.iat;
      
      // 無効なトークンを再署名
      const invalidToken = jwt.sign(decodedToken, secret, { algorithm: 'HS256' });

      // 無効なトークンで保護されたリソースにアクセス（失敗するはず）
      const protectedResponse = await request(app)
        .get('/auth/protected')
        .set('Cookie', `access_token=${invalidToken}`);

      expect(protectedResponse.status).toBe(401);
      expect(protectedResponse.body.message).toContain('Invalid token (missing iat)');
    });
  });
});
