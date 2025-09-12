/**
 * 認証関連のユーティリティ関数
 */

import { buildApiUrl } from './api';

/**
 * 認証状態をチェックする
 */
export const checkAuthStatus = async (): Promise<boolean> => {
  try {
    const response = await fetch(buildApiUrl('/auth/protected'), {
      credentials: 'include',
    });
    return response.ok;
  } catch (error) {
    console.error('Auth check failed:', error);
    return false;
  }
};

/**
 * 認証が必要なページにアクセスする前のチェック
 * リダイレクトは行わず、認証状態のみを返す
 */
export const requireAuth = async (): Promise<boolean> => {
  return await checkAuthStatus();
};
