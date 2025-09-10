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
 * @summary 旅程の共有設定を作成（認証不要）
 * @auth なし（共有リンク機能のため）
 * @params
 *   - Path: { id: string } - 旅程ID
 *   - Body: { permission: SharePermission, password?: string, expiresAt?: string, scope: ShareScope, allowedEmails?: string[] }
 * @returns
 *   - 201: { shareUrl: string, message: string }
 * @errors
 *   - 400: validation_error
 *   - 404: itinerary_not_found
 *   - 409: share_already_exists
 * @example
 *   POST /api/itineraries/abc123/share
 *   Body: { "permission": "READ_ONLY", "scope": "PUBLIC_LINK" }
 *   201: { "shareUrl": "https://example.com/shared/abc123", "message": "Share settings created successfully" }
 */
export const createItineraryShare = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedBody = (req as any).validatedBody as CreateItineraryShareRequest;

    // 旅程の存在確認
    const itinerary = await prisma.itinerary.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!itinerary) {
      return res.status(404).json({
        error: 'itinerary_not_found',
        message: 'Itinerary not found'
      });
    }

    // 既存の共有設定確認
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
    let passwordHash: string | null = null;
    if (validatedBody.password) {
      passwordHash = await bcrypt.hash(validatedBody.password, 12);
    }

    // 有効期限の変換
    let expiresAt: Date | null = null;
    if (validatedBody.expiresAt) {
      expiresAt = new Date(validatedBody.expiresAt);
    }

    // 許可されたメールアドレスリストのJSON化
    let allowedEmailsJson: string | null = null;
    if (validatedBody.allowedEmails && validatedBody.allowedEmails.length > 0) {
      allowedEmailsJson = JSON.stringify(validatedBody.allowedEmails);
    }

    // 共有設定の作成
    await prisma.itineraryShare.create({
      data: {
        itineraryId: id,
        permission: validatedBody.permission as SharePermission,
        passwordHash,
        expiresAt,
        scope: validatedBody.scope as ShareScope,
        allowedEmails: allowedEmailsJson,
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
        allowedEmails: true,
      },
    });

    if (!share) {
      return res.status(404).json({
        error: 'share_not_found',
        message: 'Share settings not found'
      });
    }

    // 許可されたメールアドレスリストの復元
    let allowedEmails: string[] | null = null;
    if (share.allowedEmails) {
      try {
        allowedEmails = JSON.parse(share.allowedEmails);
      } catch (error) {
        console.error('Failed to parse allowedEmails:', error);
        allowedEmails = null;
      }
    }

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
 * @summary 旅程の共有設定を更新（部分更新対応、認証不要）
 * @auth なし（共有リンク機能のため）
 * @params
 *   - Path: { id: string } - 旅程ID
 *   - Body: 更新するフィールドのみ（部分更新）
 * @returns
 *   - 200: { message: string }
 * @errors
 *   - 400: validation_error
 *   - 404: share_not_found
 * @example
 *   PUT /api/itineraries/abc123/share
 *   Body: { "permission": "EDIT" }
 *   200: { "message": "Share settings updated successfully" }
 */
export const updateItineraryShare = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedBody = (req as any).validatedBody as UpdateItineraryShareRequest;

    // 既存の共有設定確認
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

    if (validatedBody.password !== undefined) {
      if (validatedBody.password === null) {
        updateData.passwordHash = null;
      } else {
        updateData.passwordHash = await bcrypt.hash(validatedBody.password, 12);
      }
    }

    if (validatedBody.expiresAt !== undefined) {
      if (validatedBody.expiresAt === null) {
        updateData.expiresAt = null;
      } else {
        updateData.expiresAt = new Date(validatedBody.expiresAt);
      }
    }

    if (validatedBody.scope !== undefined) {
      updateData.scope = validatedBody.scope as ShareScope;
    }

    if (validatedBody.allowedEmails !== undefined) {
      if (validatedBody.allowedEmails === null) {
        updateData.allowedEmails = null;
      } else {
        updateData.allowedEmails = JSON.stringify(validatedBody.allowedEmails);
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
 * @summary 旅程の共有設定を削除（認証不要）
 * @auth なし（共有リンク機能のため）
 * @params
 *   - Path: { id: string } - 旅程ID
 * @returns
 *   - 204: No Content
 * @errors
 *   - 404: share_not_found
 * @example
 *   DELETE /api/itineraries/abc123/share
 *   204: No Content
 */
export const deleteItineraryShare = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 既存の共有設定確認
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
