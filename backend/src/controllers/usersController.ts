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
    if (!req.user) {
      return res.status(401).json({ 
        error: 'unauthorized',
        message: 'User not authenticated' 
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'unauthorized',
        message: 'User not found' 
      });
    }

    return res.status(200).json({
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified?.toISOString() || null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });
  } catch (error) {
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
    if (!req.user) {
      return res.status(401).json({ 
        error: 'unauthorized',
        message: 'User not authenticated' 
      });
    }

    // Zodバリデーション済みデータを取得
    const validatedBody = (req as any).validatedBody as UpdateUserProfileRequest;
    const { name } = validatedBody;

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

    return res.status(200).json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      emailVerified: updatedUser.emailVerified?.toISOString() || null,
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString(),
    });
  } catch (error) {
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
    if (!req.user) {
      return res.status(401).json({ 
        error: 'unauthorized',
        message: 'User not authenticated' 
      });
    }

    // Zodバリデーション済みデータを取得
    const validatedBody = (req as any).validatedBody as ChangePasswordRequest;
    const { currentPassword, newPassword } = validatedBody;

    // 現在のパスワードを確認
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { passwordHash: true },
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'unauthorized',
        message: 'User not found' 
      });
    }

    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ 
        error: 'invalid_current_password',
        message: 'Current password is incorrect' 
      });
    }

    // 新しいパスワードをハッシュ化して更新
    const newPasswordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { 
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
      },
    });

    return res.status(204).send();
  } catch (error) {
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
    if (!req.user) {
      return res.status(401).json({ 
        error: 'unauthorized',
        message: 'User not authenticated' 
      });
    }

    // Zodバリデーション済みデータを取得
    const validatedBody = (req as any).validatedBody as DeleteAccountRequest;
    const { password } = validatedBody;

    // パスワードを確認
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { passwordHash: true },
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'unauthorized',
        message: 'User not found' 
      });
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
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

    return res.status(204).send();
  } catch (error) {
    console.error('Delete user account error:', error);
    return res.status(500).json({ 
      error: 'internal_server_error',
      message: 'Failed to delete user account' 
    });
  }
};
