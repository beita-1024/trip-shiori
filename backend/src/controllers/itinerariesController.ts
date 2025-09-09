import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { generateRandomId } from '../utils/idGenerator';
import { AuthenticatedRequest } from '../middleware/auth';
import { 
  getItinerariesQuerySchema,
  createItinerarySchema,
  updateItinerarySchema,
  type GetItinerariesQuery,
  type CreateItineraryRequest,
  type UpdateItineraryRequest
} from '../validators/itineraryValidators';

const prisma = new PrismaClient();

/**
 * 旅のしおりを作成する
 * 
 * @summary 認証済みユーザーが新しい旅程を作成
 * @auth Bearer JWT (Cookie: access_token)
 * @params
 *   - Body: 旅程データ（任意のJSON形式）
 * @returns
 *   - 201: { id: string, message: "Itinerary created successfully" }
 * @errors
 *   - 400: validation_error
 *   - 401: unauthorized
 * @example
 *   POST /api/itineraries
 *   Body: { "title": "Tokyo Trip", "start_date": "2025-09-01" }
 *   201: { "id": "itn_123", "message": "Itinerary created successfully" }
 */
export const createItinerary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'unauthorized',
        message: 'User not authenticated' 
      });
    }

    // Zodバリデーション済みデータを取得
    const validatedBody = (req as any).validatedBody as CreateItineraryRequest;
    const payload = validatedBody;
    // Rails 実装に合わせて body 全体を JSON 文字列として保存する（互換性維持）
    const dataString = JSON.stringify(payload);

    console.debug("Received payload:", payload); // デバッグ用: 受け取ったペイロードを表示

    const MAX_ATTEMPTS = 10;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const candidateId = generateRandomId(20);

      try {
        const created = await prisma.itinerary.create({
          data: {
            id: candidateId,
            // Prisma のスキーマに応じて `data` が string/text か Json かに合わせる設計を想定。
            // ここでは互換性のため文字列を保存する実装にしている（Rails と同等の扱い）。
            data: dataString,
            userId: req.user.id, // 認証済みユーザーを所有者として設定
          },
        });

        console.debug("Created itinerary with ID:", created.id); // デバッグ用: 作成した旅のしおりのIDを表示
        return res.status(201).json({ 
          id: created.id, 
          message: "Itinerary created successfully" 
        });
      } catch (err) {
        // Prisma の一意制約違反 (P2002) が返ることがある → 別IDで再試行
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          // 衝突（非常に稀） → 再試行
          if (attempt === MAX_ATTEMPTS) {
            console.error("Failed to generate unique id after multiple attempts."); // デバッグ用: 複数回の試行後に失敗したことを表示
            return res.status(500).json({ errors: ["Failed to generate unique id (too many collisions)"] });
          }
          continue;
        }

        // その他のエラーは 422 相当で返す（Rails 実装は save failure で 422）
        console.error("create itinerary error:", err);
        return res.status(422).json({ errors: [String((err as Error).message || err)] });
      }
    }

    // 到達しないはず
    console.error("Unexpected error: Failed to create itinerary."); // デバッグ用: 予期しないエラーを表示
    return res.status(500).json({ errors: ["Failed to create itinerary"] });
  } catch (error) {
    console.error('Create itinerary error:', error);
    return res.status(500).json({ 
      error: 'internal_server_error',
      message: 'Failed to create itinerary' 
    });
  }
};

/**
 * 指定されたIDの旅のしおりを取得する
 * 
 * @summary 認証済みユーザーが自分の旅程を取得（識別子ベース）
 * @auth Bearer JWT (Cookie: access_token)
 * @params
 *   - Path: { id: string }
 * @returns
 *   - 200: 旅程データ（JSON形式）
 * @errors
 *   - 401: unauthorized
 *   - 403: forbidden
 *   - 404: not_found
 * @example
 *   GET /api/itineraries/itn_123
 *   200: { "title": "Tokyo Trip", "start_date": "2025-09-01", ... }
 */
export const getItinerary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'unauthorized',
        message: 'User not authenticated' 
      });
    }

    const { id } = req.params;

    const itinerary = await prisma.itinerary.findUnique({
      where: { id },
      select: {
        id: true,
        data: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!itinerary) {
      return res.status(404).json({ 
        error: 'not_found',
        message: 'Itinerary not found' 
      });
    }

    // 所有者チェック（userIdがnullの場合は誰でもアクセス可能）
    if (itinerary.userId && itinerary.userId !== req.user.id) {
      return res.status(403).json({ 
        error: 'forbidden',
        message: 'Access denied' 
      });
    }

    // itinerary.data が string (Rails の old style) なら JSON.parse して返し、
    // すでにオブジェクト（Prisma Json）ならそのまま返す。
    const stored = (itinerary as any).data;
    if (typeof stored === "string") {
      try {
        const parsed = JSON.parse(stored);
        return res.status(200).json(parsed);
      } catch (parseErr) {
        // もし文字列だが JSON にパースできない場合はそのまま返す（互換性重視）
        return res.status(200).json(stored);
      }
    } else {
      return res.status(200).json(stored);
    }
  } catch (error) {
    console.error("fetch itinerary error:", error);
    return res.status(500).json({ 
      error: 'internal_server_error',
      message: 'Failed to fetch itinerary' 
    });
  }
};

/**
 * ユーザーの旅程一覧を取得する（ページネーション対応）
 * 
 * @summary 認証済みユーザーが自分の旅程一覧を取得
 * @auth Bearer JWT (Cookie: access_token)
 * @params
 *   - Query: { page?: number, limit?: number, sort?: string, order?: string }
 * @returns
 *   - 200: { itineraries: Array<{id: string, data: any, createdAt: string, updatedAt: string}>, pagination: {...} }
 * @errors
 *   - 401: unauthorized
 * @example
 *   GET /api/itineraries?page=1&limit=10&sort=createdAt&order=desc
 *   200: { "itineraries": [...], "pagination": { "page": 1, "limit": 10, "total": 100, ... } }
 */
export const getUserItineraries = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'unauthorized',
        message: 'User not authenticated' 
      });
    }

    // Zodバリデーション済みクエリパラメータを取得
    const validatedQuery = (req as any).validatedQuery as GetItinerariesQuery;
    const { page, limit, sort: sortField, order } = validatedQuery;
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    const skip = (page - 1) * limit;

    // 旅程の取得（認証済みユーザーのもののみ）
    const [itineraries, total] = await Promise.all([
      prisma.itinerary.findMany({
        where: { userId: req.user.id },
        select: {
          id: true,
          data: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { [sortField]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.itinerary.count({
        where: { userId: req.user.id },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // ページネーション情報の構築
    const pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return res.status(200).json({
      itineraries,
      pagination,
    });
  } catch (error) {
    console.error('Get user itineraries error:', error);
    return res.status(500).json({ 
      error: 'internal_server_error',
      message: 'Failed to get itineraries' 
    });
  }
};

/**
 * 旅程を更新する
 * 
 * @summary 認証済みユーザーが自分の旅程を更新
 * @auth Bearer JWT (Cookie: access_token)
 * @params
 *   - Path: { id: string }
 *   - Body: 更新する旅程データ
 * @returns
 *   - 200: { message: "Itinerary updated successfully" }
 * @errors
 *   - 400: validation_error
 *   - 401: unauthorized
 *   - 403: forbidden
 *   - 404: not_found
 * @example
 *   PUT /api/itineraries/itn_123
 *   Body: { "title": "Updated Tokyo Trip", ... }
 *   200: { "message": "Itinerary updated successfully" }
 */
export const updateItinerary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'unauthorized',
        message: 'User not authenticated' 
      });
    }

    const { id } = req.params;
    // Zodバリデーション済みデータを取得
    const validatedBody = (req as any).validatedBody as UpdateItineraryRequest;
    const payload = validatedBody;

    // 旅程の存在確認と所有者チェック
    const existingItinerary = await prisma.itinerary.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingItinerary) {
      return res.status(404).json({ 
        error: 'not_found',
        message: 'Itinerary not found' 
      });
    }

    if (existingItinerary.userId !== req.user.id) {
      return res.status(403).json({ 
        error: 'forbidden',
        message: 'Access denied' 
      });
    }

    // データをJSON文字列として保存
    const dataString = JSON.stringify(payload);

    await prisma.itinerary.update({
      where: { id },
      data: { data: dataString },
    });

    return res.status(200).json({ 
      message: "Itinerary updated successfully" 
    });
  } catch (error) {
    console.error('Update itinerary error:', error);
    return res.status(500).json({ 
      error: 'internal_server_error',
      message: 'Failed to update itinerary' 
    });
  }
};

/**
 * 旅程を削除する
 * 
 * @summary 認証済みユーザーが自分の旅程を削除
 * @auth Bearer JWT (Cookie: access_token)
 * @params
 *   - Path: { id: string }
 * @returns
 *   - 204: No Content
 * @errors
 *   - 401: unauthorized
 *   - 403: forbidden
 *   - 404: not_found
 * @example
 *   DELETE /api/itineraries/itn_123
 *   204: No Content
 */
export const deleteItinerary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'unauthorized',
        message: 'User not authenticated' 
      });
    }

    const { id } = req.params;

    // 旅程の存在確認と所有者チェック
    const existingItinerary = await prisma.itinerary.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingItinerary) {
      return res.status(404).json({ 
        error: 'not_found',
        message: 'Itinerary not found' 
      });
    }

    if (existingItinerary.userId !== req.user.id) {
      return res.status(403).json({ 
        error: 'forbidden',
        message: 'Access denied' 
      });
    }

    await prisma.itinerary.delete({
      where: { id },
    });

    return res.status(204).send();
  } catch (error) {
    console.error('Delete itinerary error:', error);
    return res.status(500).json({ 
      error: 'internal_server_error',
      message: 'Failed to delete itinerary' 
    });
  }
};
