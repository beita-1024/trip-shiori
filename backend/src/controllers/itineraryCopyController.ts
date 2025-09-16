import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { generateRandomId } from '../utils/idGenerator';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../config/prisma';

/**
 * 旅程を複製して自分の旅程として保存する
 * 
 * @summary 認証済みユーザーが他のユーザーの旅程を複製して新しいIDで保存
 * @auth Bearer JWT (Cookie: access_token)
 * @idempotency 非冪等 - 同一リクエストでも毎回新しい旅程IDが生成される
 * @params
 *   - Path: { id: string } - 複製元の旅程ID
 * @returns
 *   - 201: { id: string, message: string }
 * @errors
 *   - 400: バリデーションエラー
 *   - 401: 未認証
 *   - 403: アクセス拒否
 *   - 404: 存在しない
 * @example
 *   POST /api/itineraries/copy/abc123
 *   201: { "id": "itn_456", "message": "Itinerary copied successfully" }
 */
export const copyItinerary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 認証チェック
    if (!req.user) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'User not authenticated'
      });
    }

    // ミドルウェアでバリデーション済み
    const { id } = req.params;

    // 複製元の旅程を取得
    const sourceItinerary = await prisma.itinerary.findUnique({
      where: { id },
      select: {
        id: true,
        data: true,
        userId: true,
        share: {
          select: {
            scope: true,
            permission: true,
            expiresAt: true,
          },
        },
      },
    });

    if (!sourceItinerary) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Source itinerary not found'
      });
    }

    // 自分が作成した旅程の場合は複製を拒否
    if (sourceItinerary.userId === req.user.id) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Cannot copy your own itinerary'
      });
    }

    // 共有設定の確認
    if (!sourceItinerary.share) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'This itinerary is not shared'
      });
    }

    const share = sourceItinerary.share;

    // 公開範囲の確認（PUBLIC_LINKまたはPUBLICのみ許可）
    if (share.scope !== 'PUBLIC_LINK' && share.scope !== 'PUBLIC') {
      return res.status(403).json({
        error: 'forbidden',
        message: 'This itinerary cannot be copied'
      });
    }

    // 有効期限チェック
    if (share.expiresAt && share.expiresAt < new Date()) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Share has expired'
      });
    }

    // 新しいIDを生成して複製
    const MAX_ATTEMPTS = 10;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const candidateId = generateRandomId(20);

      try {
        const copied = await prisma.$transaction(async (tx) => {
          // 旅程を複製
          const itinerary = await tx.itinerary.create({
            data: {
              id: candidateId,
              data: sourceItinerary.data,
              userId: req.user!.id, // 新しい所有者として設定
            },
          });

          // デフォルト共有設定を作成（PRIVATE）
          await tx.itineraryShare.create({
            data: {
              itineraryId: candidateId,
              permission: 'EDIT',
              scope: 'PRIVATE', // 複製した旅程はプライベート
            },
          });

          return itinerary;
        });

        return res.status(201).json({
          id: copied.id,
          message: 'Itinerary copied successfully'
        });
      } catch (err) {
        // Prisma の一意制約違反 (P2002) が返ることがある → 別IDで再試行
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          if (attempt === MAX_ATTEMPTS) {
            console.error("Failed to generate unique id after multiple attempts.");
            return res.status(500).json({
              error: 'internal_server_error',
              message: 'Failed to generate unique id (too many collisions)'
            });
          }
          continue;
        }

        console.error("Copy itinerary error:", err);
        return res.status(500).json({
          error: 'internal_server_error',
          message: 'Failed to copy itinerary'
        });
      }
    }

    return res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to copy itinerary'
    });
  } catch (error) {
    console.error('Copy itinerary error:', error);
    return res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to copy itinerary'
    });
  }
};

/**
 * ローカル保存された旅程を一括移行する
 * 
 * @summary 認証済みユーザーが登録時にローカルストレージの旅程をDBに移行
 * @auth Bearer JWT (Cookie: access_token)
 * @idempotency 非冪等 - 同一リクエストでも毎回新しい旅程IDが生成される
 * @params
 *   - Body: { itineraries: Array<{ id: string, data: any }> } - 移行する旅程の配列
 * @returns
 *   - 200: { migrated: number, message: string }
 * @errors
 *   - 400: バリデーションエラー
 *   - 401: 未認証
 * @example
 *   POST /api/itineraries/migrate
 *   Body: { "itineraries": [{ "id": "local_123", "data": {...} }] }
 *   200: { "migrated": 1, "message": "Migration completed successfully" }
 */
export const migrateLocalItineraries = async (req: AuthenticatedRequest, res: Response) => {
  // INFO: 現状、フロントエンドでは単一の旅程しか移行しないが、複数の旅程も移行できるように対応している。
  try {
    // 認証チェック
    if (!req.user) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'User not authenticated'
      });
    }

    const { itineraries } = req.body;

    // バリデーション
    if (!Array.isArray(itineraries)) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'itineraries must be an array'
      });
    }

    if (itineraries.length === 0) {
      return res.status(200).json({
        migrated: 0,
        message: 'No itineraries to migrate'
      });
    }

    // サイズチェック（LocalStorageの制限を考慮）
    const MAX_ITINERARIES = 50;
    if (itineraries.length > MAX_ITINERARIES) {
      return res.status(400).json({
        error: 'bad_request',
        message: `Too many itineraries. Maximum ${MAX_ITINERARIES} allowed`
      });
    }

    let migratedCount = 0;
    const errors: string[] = [];

    // 各旅程を移行
    for (const localItinerary of itineraries) {
      try {
        // バリデーション
        if (!localItinerary.id || !localItinerary.data) {
          errors.push(`Invalid itinerary format: ${JSON.stringify(localItinerary)}`);
          continue;
        }

        // データサイズチェック
        const dataString = typeof localItinerary.data === 'string'
          ? localItinerary.data
          : JSON.stringify(localItinerary.data);
        const MAX_DATA_SIZE = 1024 * 1024; // 1MB
        if (dataString.length > MAX_DATA_SIZE) {
          errors.push(`Itinerary ${localItinerary.id} is too large`);
          continue;
        }

        // 新しいIDを生成
        const newId = generateRandomId(20);

        // 旅程を作成
        await prisma.$transaction(async (tx) => {
          // 旅程を作成
          await tx.itinerary.create({
            data: {
              id: newId,
              data: dataString,
              userId: req.user!.id,
            },
          });

          // デフォルト共有設定を作成（PRIVATE）
          await tx.itineraryShare.create({
            data: {
              itineraryId: newId,
              permission: 'EDIT',
              scope: 'PRIVATE',
            },
          });
        });

        migratedCount++;
      } catch (err) {
        console.error(`Failed to migrate itinerary ${localItinerary.id}:`, err);
        errors.push(`Failed to migrate itinerary ${localItinerary.id}`);
      }
    }

    return res.status(200).json({
      migrated: migratedCount,
      total: itineraries.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Migration completed. ${migratedCount}/${itineraries.length} itineraries migrated successfully`
    });
  } catch (error) {
    console.error('Migrate local itineraries error:', error);
    return res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to migrate local itineraries'
    });
  }
};
