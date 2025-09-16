import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * PrismaClientの単一インスタンス
 * 
 * 開発環境ではホットリロード時に複数インスタンスが作成されるのを防ぐため、
 * グローバル変数に保存して再利用する。
 * 本番環境では毎回新しいインスタンスを作成する。
 * 
 * @summary アプリケーション全体で使用するPrismaClientの単一インスタンス
 * @returns PrismaClientインスタンス
 * @example
 *   import { prisma } from '../config/prisma';
 *   const users = await prisma.user.findMany();
 */
export const prisma = globalThis.__prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

// 本番用の終了ハンドラ（テスト用とは分離）
let productionExitHandlerRegistered = false;
if (!productionExitHandlerRegistered) {
  productionExitHandlerRegistered = true;
  
  // アプリケーション終了時のクリーンアップ
  process.on('beforeExit', async () => {
    try {
      await prisma.$disconnect();
    } catch {
      // 例外は握りつぶして安全終了
    }
  });

  // 本番環境でのシグナルハンドリング（一度きり登録）
  process.once('SIGINT', async () => {
    try {
      await prisma.$disconnect();
    } catch {
      // 例外は握りつぶして安全終了
    }
  });

  process.once('SIGTERM', async () => {
    try {
      await prisma.$disconnect();
    } catch {
      // 例外は握りつぶして安全終了
    }
  });
}
