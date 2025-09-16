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

// アプリケーション終了時のクリーンアップ
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
