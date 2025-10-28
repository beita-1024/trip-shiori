/**
 * 認証関連のユーティリティ関数
 */

import { buildApiUrl } from './api';

/**
 * 認証状態をチェックする
 */
export const checkAuthStatus = async (): Promise<boolean> => {
  try {
    console.log('checkAuthStatus: Checking auth status...');
    const response = await fetch(buildApiUrl('/auth/protected'), {
      credentials: 'include',
    });
    console.log('checkAuthStatus: Response status:', response.status, 'ok:', response.ok);
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

/**
 * Refresh Tokenを使用してAccess Tokenを更新する
 * 
 * @returns Promise<boolean> 更新成功時true、失敗時false
 * 
 * @example
 * ```typescript
 * const success = await refreshAccessToken();
 * if (success) {
 *   // Token更新成功、APIリクエストを再実行
 * } else {
 *   // Token更新失敗、ログインページにリダイレクト
 * }
 * ```
 */
export const refreshAccessToken = async (): Promise<boolean> => {
  try {
    const response = await fetch(buildApiUrl('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      console.log('Access token refreshed successfully');
      return true;
    } else {
      console.warn('Failed to refresh access token:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return false;
  }
};
