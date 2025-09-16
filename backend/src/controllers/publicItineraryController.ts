import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../config/prisma';

/**
 * 共有リンク経由で旅程を取得する
 * 
 * @summary リンクを知っている全員がアクセス可能な旅程を取得
 * @auth 不要（PUBLIC_LINKのため）
 * @params
 *   - Path: { id: string } - 旅程ID
 * @returns
 *   - 200: 旅程データ（JSON形式）+ 共有情報
 * @errors
 *   - 404: 存在しない
 *   - 403: アクセス拒否
 *   - 410: 期限切れ
 * @example
 *   GET /shared/abc123
 *   200: { "title": "Tokyo Trip", "start_date": "2025-09-01", ... }
 */
export const getSharedItinerary = async (req: Request, res: Response) => {
  try {
    // ミドルウェアでバリデーション済み
    const { id } = req.params;

    // 旅程と共有設定を同時に取得
    const itinerary = await prisma.itinerary.findUnique({
      where: { id },
      select: {
        id: true,
        data: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        share: {
          select: {
            permission: true,
            expiresAt: true,
            scope: true,
            accessCount: true,
            lastAccessedAt: true,
          },
        },
      },
    });

    if (!itinerary) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Itinerary not found'
      });
    }

    // 共有設定の存在確認
    if (!itinerary.share) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'This itinerary is not shared'
      });
    }

    const share = itinerary.share;

    // 公開範囲の確認（PUBLIC_LINKのみ許可）
    if (share.scope !== 'PUBLIC_LINK') {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Access denied'
      });
    }

    // 有効期限チェック
    if (share.expiresAt && share.expiresAt < new Date()) {
      return res.status(410).json({
        error: 'gone',
        message: 'Share has expired'
      });
    }

    // アクセス回数を更新
    await prisma.itineraryShare.update({
      where: { itineraryId: id },
      data: {
        accessCount: share.accessCount + 1,
        lastAccessedAt: new Date(),
      },
    });

    // 旅程データの解析
    const stored = itinerary.data;
    let parsedData;
    if (typeof stored === "string") {
      try {
        parsedData = JSON.parse(stored);
      } catch (parseErr) {
        parsedData = stored;
      }
    } else {
      parsedData = stored;
    }

    // 共有情報を含めて返す
    return res.status(200).json({
      ...parsedData,
      _shareInfo: {
        permission: share.permission,
        scope: share.scope,
        isReadOnly: true, // 共有リンク経由は常に読み取り専用
        accessCount: share.accessCount + 1,
        lastAccessedAt: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error("Get shared itinerary error:", error);
    return res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to fetch shared itinerary'
    });
  }
};

/**
 * 公開旅程を取得する（OGP対応）
 * 
 * @summary 誰でもアクセス可能な公開旅程を取得（検索エンジンにインデックスされる）
 * @auth 不要（PUBLICのため）
 * @params
 *   - Path: { id: string } - 旅程ID
 * @returns
 *   - 200: 旅程データ（JSON形式）+ OGP用メタデータ
 * @errors
 *   - 404: 存在しない
 *   - 403: アクセス拒否
 * @example
 *   GET /public/abc123
 *   200: { "title": "Tokyo Trip", "start_date": "2025-09-01", ... }
 */
export const getPublicItinerary = async (req: Request, res: Response) => {
  try {
    // ミドルウェアでバリデーション済み
    const { id } = req.params;

    // 旅程と共有設定を同時に取得
    const itinerary = await prisma.itinerary.findUnique({
      where: { id },
      select: {
        id: true,
        data: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        share: {
          select: {
            permission: true,
            scope: true,
            accessCount: true,
            lastAccessedAt: true,
          },
        },
      },
    });

    if (!itinerary) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Itinerary not found'
      });
    }

    // 共有設定の存在確認
    if (!itinerary.share) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'This itinerary is not public'
      });
    }

    const share = itinerary.share;

    // 公開範囲の確認（PUBLICのみ許可）
    if (share.scope !== 'PUBLIC') {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Access denied'
      });
    }

    // アクセス回数を更新
    await prisma.itineraryShare.update({
      where: { itineraryId: id },
      data: {
        accessCount: share.accessCount + 1,
        lastAccessedAt: new Date(),
      },
    });

    // 旅程データの解析
    const stored = itinerary.data;
    let parsedData;
    if (typeof stored === "string") {
      try {
        parsedData = JSON.parse(stored);
      } catch (parseErr) {
        parsedData = stored;
      }
    } else {
      parsedData = stored;
    }

    // OGP用メタデータを生成
    const ogpData = {
      title: parsedData.title || '旅のしおり',
      description: parsedData.description || '共有された旅のしおりです',
      image: parsedData.image || null,
      url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/public/${id}`,
      type: 'article',
      site_name: '旅のしおり',
    };

    // 公開情報を含めて返す
    // TODO: 将来的に画像も含めるようにする。
    // TODO: /shared/{id}と仕様を統一する？
    return res.status(200).json({
      ...parsedData,
      _publicInfo: {
        permission: share.permission,
        scope: share.scope,
        isReadOnly: true, // 公開旅程は常に読み取り専用
        accessCount: share.accessCount + 1,
        lastAccessedAt: new Date().toISOString(),
        author: {
          name: itinerary.user?.name || '匿名',
          email: itinerary.user?.email ? '***@***.***' : null, // メールアドレスは部分的にマスク
        },
        ogp: ogpData,
      }
    });
  } catch (error) {
    console.error("Get public itinerary error:", error);
    return res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to fetch public itinerary'
    });
  }
};
