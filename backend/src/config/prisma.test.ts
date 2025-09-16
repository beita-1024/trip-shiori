import { PrismaClient } from '@prisma/client';
import { describe, it, expect } from "@jest/globals";

declare global {
  // eslint-disable-next-line no-var
  var __testPrisma: PrismaClient | undefined;
}

/**
 * テスト用のPrismaClientインスタンス
 * 
 * テスト間でのデータの独立性を保つため、テスト専用のインスタンスを使用する。
 * 開発環境ではホットリロード時に複数インスタンスが作成されるのを防ぐため、
 * グローバル変数に保存して再利用する。
 * 
 * @summary テスト専用のPrismaClientインスタンス
 * @returns テスト用PrismaClientインスタンス
 * @example
 *   import { testPrisma } from '../config/prisma.test';
 *   const users = await testPrisma.user.findMany();
 */
export const testPrisma = globalThis.__testPrisma ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__testPrisma = testPrisma;
}

// テスト終了時のクリーンアップ
process.on('beforeExit', async () => {
  await testPrisma.$disconnect();
});

/**
 * PrismaClientの基本動作テスト
 */
describe('PrismaClient Test Configuration', () => {
  /**
   * テスト用PrismaClientが正常に初期化されることを確認
   */
  it('should initialize test PrismaClient successfully', () => {
    expect(testPrisma).toBeDefined();
    expect(testPrisma.$connect).toBeDefined();
    expect(testPrisma.$disconnect).toBeDefined();
  });

  /**
   * データベース接続が正常に確立されることを確認
   */
  it('should connect to test database successfully', async () => {
    await expect(testPrisma.$connect()).resolves.not.toThrow();
    await testPrisma.$disconnect();
  });

  /**
   * グローバル変数にインスタンスが保存されることを確認
   */
  it('should store instance in global variable in non-production environment', () => {
    if (process.env.NODE_ENV !== 'production') {
      expect(globalThis.__testPrisma).toBeDefined();
      expect(globalThis.__testPrisma).toBe(testPrisma);
    }
  });
});
