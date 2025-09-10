import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { hashPassword, verifyPassword } from '../utils/password';
import { 
  updateUserProfileSchema, 
  changePasswordSchema, 
  deleteAccountSchema,
  type UpdateUserProfileRequest,
  type ChangePasswordRequest,
  type DeleteAccountRequest
} from '../validators/userValidators';

const prisma = new PrismaClient();

/**
 * ユーザープロフィール情報を取得する
 * 
 * @summary 認証済みユーザーのプロフィール情報を取得
 * @auth Bearer JWT (Cookie: access_token)
 * @middleware
 *   - authenticateToken: JWT認証
 *   - checkUserExists: ユーザー存在確認
 * @context
 *   - req.user: 認証済みユーザー情報（id, email）
 *   - req.userProfile: 完全なユーザープロフィール情報（DBから取得済み）
 * @returns
 *   - 200: { id: string, email: string, name: string | null, emailVerified: string | null, createdAt: string, updatedAt: string }
 * @errors
 *   - 401: unauthorized
 * @example
 *   GET /api/users/profile
 *   200: { "id": "usr_123", "email": "user@example.com", "name": "Taro", "emailVerified": "2025-01-01T00:00:00Z", "createdAt": "2025-01-01T00:00:00Z", "updatedAt": "2025-01-01T00:00:00Z" }
 */
export const getUserProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // ミドルウェアでユーザー存在確認済み
    const user = (req as any).userProfile;

    // 日付型（Date）はISO文字列に変換して返す
    return res.status(200).json({
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified?.toISOString() || null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });
  } catch (error) {
    // 予期しないエラーは500で返す
    console.error('Get user profile error:', error);
    return res.status(500).json({ 
      error: 'internal_server_error',
      message: 'Failed to get user profile' 
    });
  }
};

/**
 * ユーザープロフィール情報を更新する
 * 
 * @summary 認証済みユーザーのプロフィール情報を更新
 * @auth Bearer JWT (Cookie: access_token)
 * @middleware
 *   - authenticateToken: JWT認証
 *   - validateBody: リクエストボディバリデーション
 * @context
 *   - req.user: 認証済みユーザー情報（id, email）
 *   - req.validatedBody: バリデーション済みリクエストボディ
 * @params
 *   - Body: { name?: string }
 * @returns
 *   - 200: 更新されたユーザー情報
 * @errors
 *   - 400: invalid_body
 *   - 401: unauthorized
 * @example
 *   PUT /api/users/profile
 *   Body: { "name": "New Name" }
 *   200: { "id": "usr_123", "email": "user@example.com", "name": "New Name", ... }
 */
export const updateUserProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 認証ユーザーが存在しない場合は401を返す
    if (!req.user) {
      return res.status(401).json({ 
        error: 'unauthorized',
        message: 'User not authenticated' 
      });
    }

    // バリデーション済みのリクエストボディを取得
    const validatedBody = (req as any).validatedBody as UpdateUserProfileRequest;
    const { name } = validatedBody;

    // nameが未指定の場合はnullで上書きされる点に注意
    // 他のフィールドは更新不可（現状nameのみ）
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { name: name || null },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 日付型はISO文字列に変換して返却
    return res.status(200).json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      emailVerified: updatedUser.emailVerified?.toISOString() || null,
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString(),
    });
  } catch (error) {
    // 予期しないエラーは500で返す
    console.error('Update user profile error:', error);
    return res.status(500).json({ 
      error: 'internal_server_error',
      message: 'Failed to update user profile' 
    });
  }
};

/**
 * ユーザーのパスワードを変更する
 * 
 * @summary 認証済みユーザーのパスワードを変更
 * @auth Bearer JWT (Cookie: access_token)
 * @middleware
 *   - authenticateToken: JWT認証
 *   - validateBody: リクエストボディバリデーション
 * @context
 *   - req.user: 認証済みユーザー情報（id, email）
 *   - req.validatedBody: バリデーション済みリクエストボディ
 * @params
 *   - Body: { currentPassword: string, newPassword: string }
 * @returns
 *   - 204: No Content
 * @errors
 *   - 400: invalid_body, invalid_current_password
 *   - 401: unauthorized
 * @example
 *   PUT /api/users/password
 *   Body: { "currentPassword": "oldpass", "newPassword": "newpass123" }
 *   204: No Content
 */
export const changePassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // ユーザー認証情報が存在するか確認
    if (!req.user) {
      return res.status(401).json({ 
        error: 'unauthorized',
        message: 'User not authenticated' 
      });
    }

    // Zodバリデーション済みのリクエストボディを取得
    // INFO: バリデーションは事前ミドルウェアで実施されている前提
    const validatedBody = (req as any).validatedBody as ChangePasswordRequest;
    const { currentPassword, newPassword } = validatedBody;

    // 現在のパスワードハッシュをDBから取得
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { passwordHash: true },
    });

    // ユーザーが存在しない場合は認証エラー
    if (!user) {
      return res.status(401).json({ 
        error: 'unauthorized',
        message: 'User not found' 
      });
    }

    // 現在のパスワードが正しいか検証
    const isCurrentPasswordValid = await verifyPassword(user.passwordHash, currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ 
        error: 'invalid_current_password',
        message: 'Current password is incorrect' 
      });
    }

    // 新しいパスワードをハッシュ化
    const newPasswordHash = await hashPassword(newPassword);

    // パスワードとパスワード変更日時を更新
    // INFO: passwordChangedAtを更新することで既存のトークンを無効化できる
    await prisma.user.update({
      where: { id: req.user.id },
      data: { 
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
      },
    });

    // 成功時は204 No Contentを返却
    return res.status(204).send();
  } catch (error) {
    // 予期しないエラーは500で返却
    console.error('Change password error:', error);
    return res.status(500).json({ 
      error: 'internal_server_error',
      message: 'Failed to change password' 
    });
  }
};

/**
 * ユーザーアカウントを削除する
 * 
 * @summary 認証済みユーザーのアカウントを削除（パスワード確認必須）
 * @auth Bearer JWT (Cookie: access_token)
 * @middleware
 *   - authenticateToken: JWT認証
 *   - validateBody: リクエストボディバリデーション
 * @context
 *   - req.user: 認証済みユーザー情報（id, email）
 *   - req.validatedBody: バリデーション済みリクエストボディ
 * @params
 *   - Body: { password: string }
 * @returns
 *   - 204: No Content
 * @errors
 *   - 400: invalid_body, invalid_password
 *   - 401: unauthorized
 * @example
 *   POST /api/users/account/delete
 *   Body: { "password": "userpassword" }
 *   204: No Content
 */
export const deleteUserAccount = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 認証ユーザーが存在するかチェック
    if (!req.user) {
      return res.status(401).json({ 
        error: 'unauthorized',
        message: 'User not authenticated' 
      });
    }

    // Zodバリデーション済みのリクエストボディを取得
    const validatedBody = (req as any).validatedBody as DeleteAccountRequest;
    const { password } = validatedBody;

    // ユーザーのパスワードハッシュを取得
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { passwordHash: true },
    });

    // ユーザーが存在しない場合は401を返却
    if (!user) {
      return res.status(401).json({ 
        error: 'unauthorized',
        message: 'User not found' 
      });
    }

    // パスワードが正しいか検証
    const isPasswordValid = await verifyPassword(user.passwordHash, password);
    if (!isPasswordValid) {
      return res.status(400).json({ 
        error: 'invalid_password',
        message: 'Password is incorrect' 
      });
    }

    // ユーザーを削除（関連する旅程もCASCADEで削除される）
    await prisma.user.delete({
      where: { id: req.user.id },
    });

    // 削除成功時は204 No Contentを返却
    return res.status(204).send();
  } catch (error) {
    // 予期しないエラーは500で返却
    console.error('Delete user account error:', error);
    return res.status(500).json({ 
      error: 'internal_server_error',
      message: 'Failed to delete user account' 
    });
  }
};
