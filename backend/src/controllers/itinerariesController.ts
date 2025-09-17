import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { generateRandomId } from '../utils/idGenerator';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../config/prisma';
import {
  type GetItinerariesQuery,
  type CreateItineraryRequest,
  type UpdateItineraryRequest,
} from '../validators/itineraryValidators';

/**
 * 旅のしおりを作成する
 *
 * @summary 認証済みユーザーが新しい旅程を作成
 * @auth Bearer JWT (Cookie: access_token)
 * @middleware
 *   - authenticateToken: JWT認証
 *   - validateBody: リクエストボディバリデーション
 * @context
 *   - req.user: 認証済みユーザー情報（id, email）
 *   - req.validatedBody: バリデーション済みリクエストボディ
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
export const createItinerary = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    // 認証チェック
    // 旅程作成は認証済みユーザーのみが実行可能で、不正な旅程作成を防ぐ
    if (!req.user) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'User not authenticated',
      });
    }

    // Zodバリデーション済みデータを取得
    const validatedBody = (req as any).validatedBody as CreateItineraryRequest;
    const payload = validatedBody;
    // Rails 実装に合わせて body 全体を JSON 文字列として保存する（互換性維持）
    const dataString = JSON.stringify(payload);

    console.debug('Received payload:', payload); // デバッグ用: 受け取ったペイロードを表示

    const MAX_ATTEMPTS = 10;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const candidateId = generateRandomId(20);

      try {
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
              userId: req.user!.id, // 認証済みユーザーを所有者として設定
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

        console.debug('Created itinerary with ID:', created.id); // デバッグ用: 作成した旅のしおりのIDを表示
        return res.status(201).json({
          id: created.id,
          message: 'Itinerary created successfully',
        });
      } catch (err) {
        // Prisma の一意制約違反 (P2002) が返ることがある → 別IDで再試行
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          // 衝突（非常に稀） → 再試行
          if (attempt === MAX_ATTEMPTS) {
            console.error(
              'Failed to generate unique id after multiple attempts.'
            ); // デバッグ用: 複数回の試行後に失敗したことを表示
            return res.status(500).json({
              errors: ['Failed to generate unique id (too many collisions)'],
            });
          }
          continue;
        }

        // その他のエラーは 422 相当で返す（Rails 実装は save failure で 422）
        console.error('create itinerary error:', err);
        return res
          .status(422)
          .json({ errors: [String((err as Error).message || err)] });
      }
    }

    // 到達しないはず
    console.error('Unexpected error: Failed to create itinerary.'); // デバッグ用: 予期しないエラーを表示
    return res.status(500).json({ errors: ['Failed to create itinerary'] });
  } catch (error) {
    console.error('Create itinerary error:', error);
    return res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to create itinerary',
    });
  }
};

// TODO: 非常に大きな関数なので分割する。
/**
 * 指定されたIDの旅のしおりを取得する
 *
 * @summary 認証済みユーザーが自分の旅程を取得、または共有設定によりアクセス可能な旅程を取得
 * @auth Bearer JWT (Cookie: access_token) - 共有設定がある場合は認証不要
 * @middleware
 *   - optionalAuthenticate: オプショナル認証（共有設定がある場合は認証不要）
 *   - validateParams: パスパラメータバリデーション
 * @context
 *   - req.user: 認証済みユーザー情報（id, email）- 認証されている場合のみ
 *   - req.params.id: バリデーション済み旅程ID
 * @params
 *   - Path: { id: string }
 * @returns
 *   - 200: 旅程データ（JSON形式）
 * @errors
 *   - 400: validation_error
 *   - 401: unauthorized
 *   - 403: forbidden
 *   - 404: not_found
 * @example
 *   GET /api/itineraries/itn_123
 *   200: { "title": "Tokyo Trip", "start_date": "2025-09-01", ... }
 */
export const getItinerary = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    // ミドルウェアでバリデーション済み
    const { id } = req.params;

    /**
     * 旅程IDで1件取得。旅程本体＋共有設定（権限・公開範囲・有効期限・許可メールアドレス）を同時に取得する。
     * - select: 必要なフィールドのみ取得し、余計なデータ転送・情報漏洩を防ぐため。
     * - share.allowedEmails: 許可メールアドレス一覧（RESTRICTED_EMAILS用）も同時取得。
     */
    // --- N+1問題を回避した実装 ---
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
            passwordHash: true,
            expiresAt: true,
            scope: true,
          },
        },
      },
    });

    if (!itinerary) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Itinerary not found',
      });
    }

    // アクセス制御ロジック
    // 旅程への不正アクセスを防ぐため、所有者・共有設定・認証状態を厳密にチェック
    const hasShareSettings = !!(itinerary as any).share;
    const isOwner =
      itinerary.userId && req.user && itinerary.userId === req.user.id;
    const isAuthenticated = !!req.user;

    // 所有者の場合は常にアクセス可能
    // 旅程の作成者は自分の旅程に常にアクセスできる必要がある
    if (isOwner) {
      // 所有者の場合は共有設定の有無に関係なくアクセス可能
    } else if (hasShareSettings) {
      // 共有設定がある場合のアクセス制御
      // 他人の旅程にアクセスする場合は、共有設定に基づいた権限チェックが必要
      const share = (itinerary as any).share;

      // 有効期限チェック
      // 期限切れの共有設定は無効化し、不正アクセスを防ぐ
      if (share.expiresAt && share.expiresAt < new Date()) {
        return res.status(403).json({
          error: 'forbidden',
          message: 'Share has expired',
        });
      }

      // 公開範囲チェック
      // 共有設定の公開範囲に応じて適切なアクセス制御を実施
      switch (share.scope) {
        case 'PUBLIC_LINK':
          // リンクを知っている人全員（認証不要）
          // 公開リンクの場合は、リンクを知っていることが認証の代わり
          break;
        case 'PUBLIC':
          // 全体公開（認証不要）
          // 全体公開の場合は誰でもアクセス可能
          break;
        default:
          // 未知の公開範囲は拒否
          // 予期しない公開範囲設定による不正アクセスを防ぐ
          return res.status(403).json({
            error: 'forbidden',
            message: 'Access denied',
          });
      }
    } else {
      // 共有設定がなく、所有者でもない場合はアクセス拒否
      // プライベートな旅程への不正アクセスを防ぐ
      if (!isAuthenticated) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'User not authenticated',
        });
      }
      return res.status(403).json({
        error: 'forbidden',
        message: 'Access denied',
      });
    }

    // itinerary.data が string (Rails の old style) なら JSON.parse して返し、
    // すでにオブジェクト（Prisma Json）ならそのまま返す。
    const stored = (itinerary as any).data;
    if (typeof stored === 'string') {
      try {
        const parsed = JSON.parse(stored);
        return res.status(200).json(parsed);
      } catch {
        // もし文字列だが JSON にパースできない場合はそのまま返す（互換性重視）
        return res.status(200).json(stored);
      }
    } else {
      return res.status(200).json(stored);
    }
  } catch (error) {
    console.error('fetch itinerary error:', error);
    return res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to fetch itinerary',
    });
  }
};

/**
 * ユーザーの旅程一覧を取得する（ページネーション・共有設定フィルター対応）
 *
 * @summary 認証済みユーザーが自分の旅程一覧、または共有された旅程も含めて取得
 * @auth Bearer JWT (Cookie: access_token)
 * @middleware
 *   - authenticateToken: JWT認証
 *   - validateQuery: クエリパラメータバリデーション
 * @context
 *   - req.user: 認証済みユーザー情報（id, email）
 *   - req.validatedQuery: バリデーション済みクエリパラメータ
 * @params
 *   - Query:
 *       - page?: number — ページ番号（デフォルト: 1）
 *       - limit?: number — 1ページあたりの件数（デフォルト: 10, 最大: 100）
 *       - sort?: string — ソート対象フィールド（createdAt/updatedAt、デフォルト: createdAt）
 *       - order?: string — ソート順（asc/desc、デフォルト: desc）
 *       - shareScope?: string | string[] — 共有範囲での絞り込み（PUBLIC_LINK/PUBLIC、単一または複数指定可能）
 *       - sharePermission?: string | string[] — 共有権限での絞り込み（READ_ONLY/EDIT、単一または複数指定可能）
 *       - includeShare?: boolean — 各旅程の共有設定情報を含めるか（デフォルト: false, オプション）
 *       - includeShared?: boolean — 共有された旅程も含めるか（デフォルト: false, オプション）
 * @returns
 *   - 200:
 *       {
 *         itineraries: Array<{
 *           id: string,                // 旅程ID
 *           data: any,                 // 旅程本体データ（JSON形式、型はバージョンにより異なる）
 *           createdAt: string,         // 作成日時（ISO8601文字列）
 *           updatedAt: string,         // 更新日時（ISO8601文字列）
 *           share?: {                  // includeShare=true時のみ
 *             id: string,              // 共有設定ID
 *             scope: string,           // 共有範囲（PUBLIC_LINK等）
 *             permission: string,      // 共有権限（READ_ONLY/EDIT）
 *             expiresAt?: string,      // 有効期限（あれば）
 *           } | null
 *         }>,
 *         pagination: {
 *           page: number,              // 現在のページ番号
 *           limit: number,             // 1ページあたり件数
 *           total: number,             // 総件数
 *           totalPages: number         // 総ページ数
 *         }
 *       }
 *     - itineraries配列には、条件に合致した旅程が格納される
 *     - includeShare=trueの場合、各旅程の共有設定情報（share）が含まれる
 *     - paginationにはページネーション情報が含まれる
 * @errors
 *   - 401: unauthorized — 未認証時
 * @example
 *   GET /api/itineraries?page=1&limit=10&sort=createdAt&order=desc&includeShare=true&includeShared=true
 *   200: {
 *     "itineraries": [
 *       {
 *         "id": "iti_abc123",
 *         "data": { ... },
 *         "createdAt": "2025-01-01T00:00:00Z",
 *         "updatedAt": "2025-01-02T00:00:00Z",
 *         "share": {
 *           "id": "shr_xyz789",
 *           "scope": "PUBLIC_LINK",
 *           "permission": "READ_ONLY",
 *           "expiresAt": null
 *         }
 *       }
 *     ],
 *     "pagination": {
 *       "page": 1,
 *       "limit": 10,
 *       "total": 100,
 *       "totalPages": 10
 *     }
 *   }
 * @options
 *   - includeShare: true にすると各旅程の共有設定情報（share）がレスポンスに含まれる
 *   - includeShared: true にすると自分が作成した旅程だけでなく、共有された旅程も一覧に含まれる
 */
export const getUserItineraries = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    // 認証チェック
    // 旅程一覧取得は認証済みユーザーのみが実行可能で、他人の旅程情報の不正取得を防ぐ
    if (!req.user) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'User not authenticated',
      });
    }

    // Zodバリデーション済みクエリパラメータを取得
    const validatedQuery = (req as any).validatedQuery as GetItinerariesQuery;
    const {
      page,
      limit,
      sort: sortField,
      order,
      shareScope,
      sharePermission,
      includeShare,
      includeShared,
    } = validatedQuery;
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    // ページネーションのスキップ数を計算
    const skip = (page - 1) * limit;

    // 基本的なWHERE条件を構築
    const whereConditions: any[] = [];

    if (includeShared) {
      // 自分が作成したもの + 共有されたもののみアクセス可能
      // 他人の旅程にアクセスする場合は、共有設定に基づいた厳密な権限チェックが必要
      whereConditions.push({
        OR: [
          { userId: req.user.id }, // 自分が作成したものは常にアクセス可能
          {
            AND: [
              { userId: { not: req.user.id } }, // 他人が作成したもののみ対象
              {
                share: {
                  OR: [
                    { scope: 'PUBLIC_LINK' }, // 公開リンク - リンクを知っている人全員がアクセス可能
                    { scope: 'PUBLIC' }, // 全体公開 - 誰でもアクセス可能
                  ],
                },
              },
            ],
          },
        ],
      });
    } else {
      // 自分が作成したもののみアクセス可能
      // includeShared=falseの場合は、プライベートな旅程のみを取得
      whereConditions.push({ userId: req.user.id });
    }

    // 共有設定フィルターを追加
    if (shareScope || sharePermission) {
      const shareFilter: any = {};
      if (shareScope) {
        // 単一の値または配列の値を処理
        if (Array.isArray(shareScope)) {
          shareFilter.scope = { in: shareScope };
        } else {
          shareFilter.scope = shareScope;
        }
      }
      if (sharePermission) {
        // 単一の値または配列の値を処理
        if (Array.isArray(sharePermission)) {
          shareFilter.permission = { in: sharePermission };
        } else {
          shareFilter.permission = sharePermission;
        }
      }
      whereConditions.push({ share: shareFilter });
    }

    const whereClause =
      whereConditions.length > 1
        ? { AND: whereConditions }
        : whereConditions[0];

    // 取得するフィールドを決定
    const selectFields: any = {
      id: true,
      data: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
    };

    if (includeShare) {
      selectFields.share = {
        select: {
          permission: true,
          scope: true,
          expiresAt: true,
          accessCount: true,
          lastAccessedAt: true,
        },
      };
    }

    // 旅程の取得
    const [rawItineraries, total] = await Promise.all([
      prisma.itinerary.findMany({
        where: whereClause,
        select: selectFields,
        orderBy: { [sortField]: sortOrder },
        // ページネーション
        skip,
        take: limit,
      }),
      prisma.itinerary.count({
        where: whereClause,
      }),
    ]);

    // dataフィールドの型揺れを解決（string → object に正規化）
    const itineraries = rawItineraries.map((it) => {
      const d = (it as any).data;
      let parsedData;
      if (typeof d === 'string') {
        try {
          parsedData = JSON.parse(d);
        } catch {
          parsedData = d;
        }
      } else {
        parsedData = d;
      }

      const result: any = {
        id: it.id,
        data: parsedData,
        createdAt: it.createdAt,
        updatedAt: it.updatedAt,
        userId: it.userId,
      };

      if (includeShare) {
        if ((it as any).share) {
          result.share = {
            permission: (it as any).share.permission,
            scope: (it as any).share.scope,
            expiresAt: (it as any).share.expiresAt,
            accessCount: (it as any).share.accessCount,
            lastAccessedAt: (it as any).share.lastAccessedAt,
          };
        } else {
          // 共有設定が存在しない場合は明示的にnullを設定
          result.share = null;
        }
      }

      return result;
    });

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
      message: 'Failed to get itineraries',
    });
  }
};

/**
 * 旅程を更新する
 *
 * @summary 認証済みユーザーが自分の旅程を更新
 * @auth Bearer JWT (Cookie: access_token)
 * @middleware
 *   - authenticateToken: JWT認証
 *   - checkItineraryOwnershipForEdit: 旅程所有権チェック
 *   - validateParams: パスパラメータバリデーション
 *   - validateBody: リクエストボディバリデーション
 * @context
 *   - req.user: 認証済みユーザー情報（id, email）
 *   - req.params.id: バリデーション済み旅程ID
 *   - req.validatedBody: バリデーション済みリクエストボディ
 *   - req.existingItinerary: 旅程情報（所有権チェック済み）
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
export const updateItinerary = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    // ミドルウェアでバリデーション済み
    const { id } = req.params;
    // Zodバリデーション済みデータを取得
    const validatedBody = (req as any).validatedBody as UpdateItineraryRequest;
    const payload = validatedBody;

    // ミドルウェアで所有権チェック済み
    // const existingItinerary = (req as any).existingItinerary;

    // データをJSON文字列として保存
    const dataString = JSON.stringify(payload);

    await prisma.itinerary.update({
      where: { id },
      data: { data: dataString },
    });

    return res.status(200).json({
      message: 'Itinerary updated successfully',
    });
  } catch (error) {
    console.error('Update itinerary error:', error);
    return res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to update itinerary',
    });
  }
};

/**
 * 旅程を削除する
 *
 * @summary 認証済みユーザーが自分の旅程を削除
 * @auth Bearer JWT (Cookie: access_token)
 * @middleware
 *   - authenticateToken: JWT認証
 *   - checkItineraryOwnershipForEdit: 旅程所有権チェック
 *   - validateParams: パスパラメータバリデーション
 * @context
 *   - req.user: 認証済みユーザー情報（id, email）
 *   - req.params.id: バリデーション済み旅程ID
 *   - req.existingItinerary: 旅程情報（所有権チェック済み）
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
export const deleteItinerary = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    // ミドルウェアでバリデーション済み
    const { id } = req.params;

    // ミドルウェアで所有権チェック済み
    // const existingItinerary = (req as any).existingItinerary;

    // 旅程削除（関連する共有設定はカスケード削除で自動的に削除される）
    await prisma.itinerary.delete({
      where: { id },
    });

    return res.status(204).send();
  } catch (error) {
    console.error('Delete itinerary error:', error);
    return res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to delete itinerary',
    });
  }
};

/**
 * 旅程の所有者かどうかを確認する
 *
 * @summary 指定された旅程IDが現在のユーザーのものかどうかを確認
 * @auth Bearer JWT (Cookie: access_token)
 * @middleware
 *   - authenticateToken: JWT認証
 * @context
 *   - req.user: 認証済みユーザー情報（id, email）
 * @params
 *   - Path: { id: string } - 旅程ID
 * @returns
 *   - 200: { isOwner: boolean, message: string }
 * @errors
 *   - 401: unauthorized
 *   - 404: not_found
 * @example
 *   GET /api/itineraries/abc123/ownership
 *   200: { "isOwner": true, "message": "User is the owner of this itinerary" }
 */
export const checkItineraryOwnership = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    // 認証チェック
    if (!req.user) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'User not authenticated',
      });
    }

    // ミドルウェアでバリデーション済み
    const { id } = req.params;

    // 旅程の存在確認と所有者チェック
    const itinerary = await prisma.itinerary.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!itinerary) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Itinerary not found',
      });
    }

    const isOwner = itinerary.userId === req.user.id;

    return res.status(200).json({
      isOwner,
      message: isOwner
        ? 'User is the owner of this itinerary'
        : 'User is not the owner of this itinerary',
    });
  } catch (error) {
    console.error('Check itinerary ownership error:', error);
    return res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to check itinerary ownership',
    });
  }
};
