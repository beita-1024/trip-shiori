import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { 
  createItineraryShareSchema,
  updateItineraryShareSchema,
  type CreateItineraryShareRequest,
  type UpdateItineraryShareRequest,
  type SharePermission,
  type ShareScope
} from '../validators/itineraryShareValidators';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * 共有設定を作成する
 * 
 * @summary 旅程の所有者が共有設定を作成
 * @auth Bearer JWT (Cookie: access_token)
 * @middleware
 *   - authenticateToken: JWT認証
 *   - checkItineraryOwnership: 旅程所有権チェック
 *   - validateParams: パスパラメータバリデーション
 *   - validateBody: リクエストボディバリデーション
 * @context
 *   - req.user: 認証済みユーザー情報（id, email）
 *   - req.params.id: バリデーション済み旅程ID
 *   - req.validatedBody: バリデーション済みリクエストボディ
 *   - req.itinerary: 旅程情報（所有権チェック済み）
 * @params
 *   - Path: { id: string } - 旅程ID
 *   - Body: { permission: SharePermission, password?: string, expiresAt?: string, scope: ShareScope, allowedEmails?: string[] }
 * @returns
 *   - 201: { shareUrl: string, message: string }
 * @errors
 *   - 400: validation_error
 *   - 401: unauthorized
 *   - 403: forbidden
 *   - 404: itinerary_not_found
 *   - 409: share_already_exists
 * @example
 *   POST /api/itineraries/abc123/share
 *   Body: { "permission": "READ_ONLY", "scope": "PUBLIC_LINK" }
 *   201: { "shareUrl": "https://example.com/shared/abc123", "message": "Share settings created successfully" }
 */
export const createItineraryShare = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validatedBody = (req as any).validatedBody as CreateItineraryShareRequest;

    // ミドルウェアで所有権チェック済み
    const itinerary = (req as any).itinerary;

    // 既存の共有設定確認
    // 重複する共有設定の作成を防ぎ、データの整合性を保つ
    const existingShare = await prisma.itineraryShare.findUnique({
      where: { itineraryId: id },
    });

    if (existingShare) {
      return res.status(409).json({
        error: 'share_already_exists',
        message: 'Share settings already exist for this itinerary'
      });
    }

    // パスワードのハッシュ化
    // 平文パスワードを保存せず、bcryptでハッシュ化してセキュリティを確保
    let passwordHash: string | null = null;
    if (validatedBody.password) {
      passwordHash = await bcrypt.hash(validatedBody.password, 12); // ソルトラウンド12でハッシュ化
    }

    // 有効期限の変換
    // 有効期限を適切にDate型に変換し、期限切れの共有設定を自動的に無効化
    let expiresAt: Date | null = null;
    if (validatedBody.expiresAt) {
      expiresAt = new Date(validatedBody.expiresAt);
    }

    // 共有設定の作成（メールアドレスも含む）
    // トランザクション内で共有設定とメールアドレスを一括作成し、データ整合性を保つ
    await prisma.itineraryShare.create({
      data: {
        itineraryId: id,
        permission: validatedBody.permission as SharePermission,
        passwordHash, // ハッシュ化済みパスワードを保存
        expiresAt, // 有効期限を設定
        scope: validatedBody.scope as ShareScope,
        allowedEmails: {
          create: validatedBody.allowedEmails?.map((email: string) => ({
            email: email, // 許可されたメールアドレスのみ保存
          })) || [],
        } as any,
      },
    });

    // 共有URLの生成（フロントエンドのURLを想定）
    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/shared/${id}`;

    return res.status(201).json({
      shareUrl,
      message: 'Share settings created successfully'
    });
  } catch (error) {
    console.error('Create itinerary share error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Failed to create share settings'
    });
  }
};

/**
 * 共有設定を取得する
 * 
 * @summary 旅程の共有設定を取得（認証不要）
 * @auth なし（共有リンク機能のため）
 * @middleware
 *   - validateParams: パスパラメータバリデーション
 * @context
 *   - req.params.id: バリデーション済み旅程ID
 * @params
 *   - Path: { id: string } - 旅程ID
 * @returns
 *   - 200: { permission: SharePermission, hasPassword: boolean, expiresAt: string | null, scope: ShareScope, allowedEmails: string[] | null }
 * @errors
 *   - 404: share_not_found
 * @example
 *   GET /api/itineraries/abc123/share
 *   200: { "permission": "READ_ONLY", "hasPassword": true, "expiresAt": "2024-12-31T23:59:59Z", "scope": "PUBLIC_LINK", "allowedEmails": null }
 */
export const getItineraryShare = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const share = await prisma.itineraryShare.findUnique({
      where: { itineraryId: id },
      select: {
        permission: true,
        passwordHash: true,
        expiresAt: true,
        scope: true,
        allowedEmails: {
          select: {
            email: true,
          },
        } as any,
      },
    });

    if (!share) {
      return res.status(404).json({
        error: 'share_not_found',
        message: 'Share settings not found'
      });
    }

    // 許可されたメールアドレスリストの復元
    const allowedEmails = (share.allowedEmails as any)?.map((email: any) => email.email) || [];

    return res.status(200).json({
      permission: share.permission,
      hasPassword: !!share.passwordHash,
      expiresAt: share.expiresAt?.toISOString() || null,
      scope: share.scope,
      allowedEmails,
    });
  } catch (error) {
    console.error('Get itinerary share error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Failed to get share settings'
    });
  }
};

/**
 * 共有設定を更新する
 * 
 * @summary 旅程の所有者が共有設定を更新（部分更新対応）
 * @auth Bearer JWT (Cookie: access_token)
 * @middleware
 *   - authenticateToken: JWT認証
 *   - checkItineraryOwnership: 旅程所有権チェック
 *   - validateParams: パスパラメータバリデーション
 *   - validateBody: リクエストボディバリデーション
 * @context
 *   - req.user: 認証済みユーザー情報（id, email）
 *   - req.params.id: バリデーション済み旅程ID
 *   - req.validatedBody: バリデーション済みリクエストボディ
 *   - req.itinerary: 旅程情報（所有権チェック済み）
 * @params
 *   - Path: { id: string } - 旅程ID
 *   - Body: 更新するフィールドのみ（部分更新）
 * @returns
 *   - 200: { message: string }
 * @errors
 *   - 400: validation_error
 *   - 401: unauthorized
 *   - 403: forbidden
 *   - 404: share_not_found
 * @example
 *   PUT /api/itineraries/abc123/share
 *   Body: { "permission": "EDIT" }
 *   200: { "message": "Share settings updated successfully" }
 */
export const updateItineraryShare = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validatedBody = (req as any).validatedBody as UpdateItineraryShareRequest;

    // ミドルウェアで所有権チェック済み
    const itinerary = (req as any).itinerary;

    // 既存の共有設定確認
    // 存在しない共有設定の更新を防ぎ、不正なIDによる攻撃を防ぐ
    const existingShare = await prisma.itineraryShare.findUnique({
      where: { itineraryId: id },
    });

    if (!existingShare) {
      return res.status(404).json({
        error: 'share_not_found',
        message: 'Share settings not found'
      });
    }

    // 更新データの準備
    const updateData: Prisma.ItineraryShareUpdateInput = {};

    if (validatedBody.permission !== undefined) {
      updateData.permission = validatedBody.permission as SharePermission;
    }

    // パスワードの更新処理
    // パスワードの設定・削除時に適切なハッシュ化・null化を実施
    if (validatedBody.password !== undefined) {
      if (validatedBody.password === null) {
        updateData.passwordHash = null; // パスワード削除
      } else {
        updateData.passwordHash = await bcrypt.hash(validatedBody.password, 12); // ソルトラウンド12でハッシュ化
      }
    }

    // 有効期限の更新処理
    // 有効期限の設定・削除時に適切なDate型変換・null化を実施
    if (validatedBody.expiresAt !== undefined) {
      if (validatedBody.expiresAt === null) {
        updateData.expiresAt = null; // 有効期限削除（無期限）
      } else {
        updateData.expiresAt = new Date(validatedBody.expiresAt); // 有効期限設定
      }
    }

    if (validatedBody.scope !== undefined) {
      updateData.scope = validatedBody.scope as ShareScope;
    }

    // 許可されたメールアドレスリストの更新処理
    // メールアドレスリストの設定・削除時に適切なデータ操作を実施
    if (validatedBody.allowedEmails !== undefined) {
      if (validatedBody.allowedEmails === null) {
        // 既存のメールアドレスを削除（アクセス権限を完全に削除）
        (updateData as any).allowedEmails = {
          deleteMany: {},
        };
      } else {
        // 既存のメールアドレスを削除して新しいものを追加（権限の完全な置き換え）
        (updateData as any).allowedEmails = {
          deleteMany: {},
          create: validatedBody.allowedEmails.map((email: string) => ({
            email: email, // 許可されたメールアドレスのみ保存
          })),
        };
      }
    }

    // 共有設定の更新
    await prisma.itineraryShare.update({
      where: { itineraryId: id },
      data: updateData,
    });

    return res.status(200).json({
      message: 'Share settings updated successfully'
    });
  } catch (error) {
    console.error('Update itinerary share error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Failed to update share settings'
    });
  }
};

/**
 * 共有設定を削除する
 * 
 * @summary 旅程の所有者が共有設定を削除
 * @auth Bearer JWT (Cookie: access_token)
 * @middleware
 *   - authenticateToken: JWT認証
 *   - checkItineraryOwnership: 旅程所有権チェック
 *   - validateParams: パスパラメータバリデーション
 * @context
 *   - req.user: 認証済みユーザー情報（id, email）
 *   - req.params.id: バリデーション済み旅程ID
 *   - req.itinerary: 旅程情報（所有権チェック済み）
 * @params
 *   - Path: { id: string } - 旅程ID
 * @returns
 *   - 204: No Content
 * @errors
 *   - 401: unauthorized
 *   - 403: forbidden
 *   - 404: share_not_found
 * @example
 *   DELETE /api/itineraries/abc123/share
 *   204: No Content
 */
export const deleteItineraryShare = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // ミドルウェアで所有権チェック済み
    const itinerary = (req as any).itinerary;

    // 既存の共有設定確認
    // 存在しない共有設定の削除を防ぎ、不正なIDによる攻撃を防ぐ
    const existingShare = await prisma.itineraryShare.findUnique({
      where: { itineraryId: id },
    });

    if (!existingShare) {
      return res.status(404).json({
        error: 'share_not_found',
        message: 'Share settings not found'
      });
    }

    // 共有設定の削除
    // 共有設定と関連するメールアドレスを完全に削除し、アクセス権限を無効化
    await prisma.itineraryShare.delete({
      where: { itineraryId: id },
    });

    return res.status(204).send();
  } catch (error) {
    console.error('Delete itinerary share error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Failed to delete share settings'
    });
  }
};
