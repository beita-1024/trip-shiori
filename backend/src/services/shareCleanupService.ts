import { prisma } from '../config/prisma';

/**
 * 期限切れの共有設定をクリーンアップする
 * 
 * @summary 有効期限が過ぎた共有設定を削除
 * @returns 削除された共有設定の数
 */
export const cleanupExpiredShares = async (): Promise<number> => {
  try {
    const now = new Date();
    
    const result = await prisma.itineraryShare.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    console.log(`Cleaned up ${result.count} expired share settings`);
    return result.count;
  } catch (error) {
    console.error('Failed to cleanup expired shares:', error);
    throw error;
  }
};

/**
 * 存在しない旅程に関連する共有設定をクリーンアップする
 * 
 * @summary 旅程が削除されたが共有設定が残っている場合のクリーンアップ
 * @returns 削除された共有設定の数
 */
export const cleanupOrphanedShares = async (): Promise<number> => {
  try {
    // 存在しない旅程に関連する共有設定を検索
    // まず全ての共有設定を取得し、旅程の存在を確認
    const allShares = await prisma.itineraryShare.findMany({
      select: {
        id: true,
        itineraryId: true,
      },
    });

    const orphanedShares = [];
    for (const share of allShares) {
      const itinerary = await prisma.itinerary.findUnique({
        where: { id: share.itineraryId },
        select: { id: true },
      });
      if (!itinerary) {
        orphanedShares.push(share);
      }
    }

    if (orphanedShares.length === 0) {
      return 0;
    }

    // 孤立した共有設定を削除
    const result = await prisma.itineraryShare.deleteMany({
      where: {
        id: {
          in: orphanedShares.map(share => share.id),
        },
      },
    });

    console.log(`Cleaned up ${result.count} orphaned share settings`);
    return result.count;
  } catch (error) {
    console.error('Failed to cleanup orphaned shares:', error);
    throw error;
  }
};

/**
 * 古い共有設定をクリーンアップする（作成から一定期間経過）
 * 
 * @summary 作成から指定日数経過した共有設定を削除
 * @param daysOld 削除対象となる日数（デフォルト: 365日）
 * @returns 削除された共有設定の数
 */
export const cleanupOldShares = async (daysOld: number = 365): Promise<number> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await prisma.itineraryShare.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`Cleaned up ${result.count} old share settings (older than ${daysOld} days)`);
    return result.count;
  } catch (error) {
    console.error('Failed to cleanup old shares:', error);
    throw error;
  }
};

/**
 * 全てのクリーンアップ処理を実行する
 * 
 * @summary 期限切れ、孤立、古い共有設定のクリーンアップを一括実行
 * @param options クリーンアップオプション
 * @returns クリーンアップ結果のサマリー
 */
export const runFullCleanup = async (options: {
  cleanupExpired?: boolean;
  cleanupOrphaned?: boolean;
  cleanupOld?: boolean;
  oldDaysThreshold?: number;
} = {}): Promise<{
  expired: number;
  orphaned: number;
  old: number;
  total: number;
}> => {
  const {
    cleanupExpired = true,
    cleanupOrphaned = true,
    cleanupOld = true,
    oldDaysThreshold = 365,
  } = options;

  let expired = 0;
  let orphaned = 0;
  let old = 0;

  try {
    if (cleanupExpired) {
      expired = await cleanupExpiredShares();
    }

    if (cleanupOrphaned) {
      orphaned = await cleanupOrphanedShares();
    }

    if (cleanupOld) {
      old = await cleanupOldShares(oldDaysThreshold);
    }

    const total = expired + orphaned + old;
    
    console.log(`Full cleanup completed: ${total} total shares cleaned up (expired: ${expired}, orphaned: ${orphaned}, old: ${old})`);
    
    return {
      expired,
      orphaned,
      old,
      total,
    };
  } catch (error) {
    console.error('Failed to run full cleanup:', error);
    throw error;
  }
};
