/**
 * 認証状態を管理するカスタムフック
 * 
 * ユーザーの認証状態、ユーザー情報、ログアウト機能を提供します。
 * 認証状態の変更をリアルタイムで追跡し、コンポーネントの再レンダリングを管理します。
 * 
 * @returns 認証状態とユーザー情報、ログアウト関数
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isAuthenticated, user, logout, isLoading } = useAuth();
 *   
 *   if (isLoading) return <Spinner />;
 *   
 *   return (
 *     <div>
 *       {isAuthenticated ? (
 *         <div>こんにちは、{user?.name}さん</div>
 *       ) : (
 *         <div>ログインしてください</div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { buildApiUrl } from '@/lib/api';
import type { User } from '@/types';

interface UseAuthReturn {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  /**
   * 認証状態をチェックし、ユーザー情報を取得する
   */
  const checkAuthStatus = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // 認証状態をチェック（ユーザー情報も含む）
      const authResponse = await fetch(buildApiUrl('/auth/protected'), {
        credentials: 'include',
      });

      if (authResponse.ok) {
        const authData = await authResponse.json();
        // /auth/protectedからユーザー情報を取得
        if (authData.user) {
          setUser({
            id: authData.user.id,
            email: authData.user.email,
            name: authData.user.name || authData.user.email.split('@')[0], // nameがない場合はemailの@より前の部分を使用
            createdAt: authData.user.createdAt || new Date().toISOString(),
          });
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * ログアウト処理
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      await fetch(buildApiUrl('/auth/logout'), {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // ログアウト処理が成功・失敗に関わらず、ローカル状態をクリア
      setUser(null);
      setIsAuthenticated(false);
      // ログインページにリダイレクト
      router.push('/login');
    }
  }, [router]);

  /**
   * 認証状態を手動でリフレッシュする
   */
  const refreshAuth = useCallback(async (): Promise<void> => {
    await checkAuthStatus();
  }, [checkAuthStatus]);

  // 初回マウント時に認証状態をチェック
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return {
    isAuthenticated,
    user,
    isLoading,
    logout,
    refreshAuth,
  };
}
