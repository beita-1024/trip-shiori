import { PrismaClient } from '@prisma/client';

declare global {
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
 *   import { testPrisma } from '../testutils/prismaClient';
 *   const users = await testPrisma.user.findMany();
 */
export const testPrisma =
  globalThis.__testPrisma ??
  new PrismaClient({
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

// テスト専用の終了ハンドラ（本番用とは分離）
let testExitHandlerRegistered = false;
if (!testExitHandlerRegistered) {
  testExitHandlerRegistered = true;

  // テスト終了時のクリーンアップ
  process.on('beforeExit', async () => {
    try {
      await testPrisma.$disconnect();
    } catch {
      // 例外は握りつぶして安全終了
    }
  });

  // テスト環境でのシグナルハンドリング（一度きり登録）
  process.once('SIGINT', async () => {
    try {
      await testPrisma.$disconnect();
    } catch {
      // 例外は握りつぶして安全終了
    }
  });

  process.once('SIGTERM', async () => {
    try {
      await testPrisma.$disconnect();
    } catch {
      // 例外は握りつぶして安全終了
    }
  });
}
