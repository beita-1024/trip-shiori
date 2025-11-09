import { Prisma } from '@prisma/client';
import { generateRandomId } from './idGenerator';
import { prisma } from '../config/prisma';
import { sampleItineraryData } from '../data/sampleItinerary';

/**
 * サンプル旅程を作成する
 *
 * 新規アカウント作成時に自動的に追加されるサンプル旅程を作成します。
 * 既存の旅程作成ロジックと同様に、ID衝突時のリトライ処理を実装しています。
 *
 * @param userId - 旅程を作成するユーザーID
 * @returns 作成された旅程のID、または失敗時はnull
 * @example
 * const itineraryId = await createSampleItinerary('user123');
 */
export async function createSampleItinerary(
  userId: string
): Promise<string | null> {
  const MAX_ATTEMPTS = 10;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const candidateId = generateRandomId(20);

    try {
      // 旅程データをJSON文字列に変換
      const dataString = JSON.stringify(sampleItineraryData);

      /**
       * 旅程作成（プライベートな旅程として作成）
       * デフォルトでPRIVATEな共有設定を同時に作成する
       */
      const created = await prisma.$transaction(async (tx) => {
        const itinerary = await tx.itinerary.create({
          data: {
            id: candidateId,
            // Prisma のスキーマに応じて `data` が string/text か Json かに合わせる設計を想定。
            // ここでは互換性のため文字列を保存する実装にしている（Rails と同等の扱い）。
            data: dataString,
            userId: userId,
          },
        });

        // デフォルト共有設定を作成（PRIVATE）
        await tx.itineraryShare.create({
          data: {
            itineraryId: candidateId,
            permission: 'EDIT',
            scope: 'PRIVATE', // デフォルトはプライベート
          },
        });

        return itinerary;
      });

      console.debug('Created sample itinerary with ID:', created.id);
      return created.id;
    } catch (err) {
      // Prisma の一意制約違反 (P2002) が返ることがある → 別IDで再試行
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        // 衝突（非常に稀） → 再試行
        if (attempt === MAX_ATTEMPTS) {
          console.error(
            'Failed to generate unique id for sample itinerary after multiple attempts.'
          );
          return null;
        }
        continue;
      }

      // その他のエラーはログに記録してnullを返す
      console.error('Failed to create sample itinerary:', err);
      return null;
    }
  }

  // 到達しないはず
  console.error('Unexpected error: Failed to create sample itinerary.');
  return null;
}
