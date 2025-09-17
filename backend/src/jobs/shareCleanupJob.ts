import cron from 'node-cron';
import { runFullCleanup } from '../services/shareCleanupService';

/**
 * 共有設定のクリーンアップジョブ
 *
 * 毎日午前2時に実行され、以下のクリーンアップ処理を行います：
 * - 期限切れの共有設定の削除
 * - 孤立した共有設定の削除
 * - 古い共有設定の削除（365日以上前）
 */
export const startShareCleanupJob = (): void => {
  // 毎日午前2時に実行（cron: 0 2 * * *）
  cron.schedule(
    '0 2 * * *',
    async () => {
      console.log('Starting scheduled share cleanup job...');

      try {
        const result = await runFullCleanup({
          cleanupExpired: true,
          cleanupOrphaned: true,
          cleanupOld: true,
          oldDaysThreshold: 365,
        });

        console.log(
          'Scheduled share cleanup job completed successfully:',
          result
        );
      } catch (error) {
        console.error('Scheduled share cleanup job failed:', error);
      }
    },
    {
      timezone: 'UTC',
    }
  );

  console.log('Share cleanup job scheduled to run daily at 2:00 AM UTC');
};

/**
 * 手動でクリーンアップを実行する関数（テスト・デバッグ用）
 */
export const runManualCleanup = async (): Promise<void> => {
  console.log('Starting manual share cleanup...');

  try {
    const result = await runFullCleanup({
      cleanupExpired: true,
      cleanupOrphaned: true,
      cleanupOld: true,
      oldDaysThreshold: 365,
    });

    console.log('Manual share cleanup completed successfully:', result);
  } catch (error) {
    console.error('Manual share cleanup failed:', error);
    throw error;
  }
};
