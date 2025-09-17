import { describe, it, expect } from '@jest/globals';
import { testPrisma } from '../testutils/prismaClient';

// テスト用PrismaClientをtestutilsからre-export
export { testPrisma };

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
