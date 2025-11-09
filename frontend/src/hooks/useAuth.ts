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

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { buildApiUrl, apiFetch, addAuthInvalidatedListener } from '@/lib/api';
import { refreshAccessToken } from '@/lib/auth';
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
  const HEARTBEAT_MS = typeof window === 'undefined'
    ? 300000
    : Number(process.env.NEXT_PUBLIC_AUTH_HEARTBEAT_MS || 300000);
  const refreshTimeoutRef = useRef<number | null>(null);
  const checkAuthStatusRef = useRef<(() => Promise<void>) | null>(null);
  const checkAuthTimeoutRef = useRef<number | null>(null);
  const checkAuthResolversRef = useRef<Array<() => void>>([]);

  const clearScheduledRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  // 後続で使用するリフレッシュスケジューラ
  const scheduleRefreshFromExp = useCallback((expSeconds?: number | null) => {
    clearScheduledRefresh();
    if (!expSeconds || Number.isNaN(expSeconds)) {
      return;
    }
    const SAFETY_WINDOW_MS = 60000; // 60s前倒し
    const targetTimeMs = expSeconds * 1000 - SAFETY_WINDOW_MS;
    const delayMs = Math.max(targetTimeMs - Date.now(), 0);
    if (delayMs === Infinity || delayMs > 24 * 60 * 60 * 1000) {
      return;
    }
    refreshTimeoutRef.current = window.setTimeout(async () => {
      try {
        const ok = await refreshAccessToken();
        if (!ok) {
          setUser(null);
          setIsAuthenticated(false);
          return;
        }
        await (checkAuthStatusRef.current?.() ?? Promise.resolve());
      } catch {
        setUser(null);
        setIsAuthenticated(false);
      }
    }, delayMs);
  }, [clearScheduledRefresh]);

  /**
   * pendingマイグレーションを実行する
   */
  const handlePendingMigration = useCallback(async (): Promise<void> => {
    try {
      const pendingItinerary = sessionStorage.getItem('pendingLocalItinerary');
      if (!pendingItinerary) {
        return;
      }

      const itineraryData = JSON.parse(pendingItinerary);
      const payload = {
        itineraries: [{ id: `local_${Date.now()}`, data: itineraryData }],
      };

      const response = await fetch(buildApiUrl('/api/itineraries/migrate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // マイグレーション成功時はsessionStorageから削除
        sessionStorage.removeItem('pendingLocalItinerary');
        console.log('Local itinerary migrated successfully');
      } else {
        console.error('Migration failed with status:', response.status);
      }
    } catch (error) {
      console.error('Migration error:', error);
    }
  }, []);

  /**
   * 認証状態をチェックし、ユーザー情報を取得する（デバウンス付き）
   */
  const checkAuthStatus = useCallback(async (): Promise<void> => {
    // デバウンス: 100ms以内の連続呼び出しを1回にまとめる
    return new Promise<void>((resolve) => {
      checkAuthResolversRef.current.push(resolve);
      if (checkAuthTimeoutRef.current) {
        clearTimeout(checkAuthTimeoutRef.current);
      }
      checkAuthTimeoutRef.current = window.setTimeout(async () => {
        checkAuthTimeoutRef.current = null;
        const flushResolvers = () => {
          const resolvers = checkAuthResolversRef.current.splice(0);
          resolvers.forEach((resolver) => resolver());
        };
        try {
          setIsLoading(true);
          
          // /login や /shared 配下では認証チェックをスキップ（リダイレクト抑止）
          if (
            typeof window !== 'undefined' &&
            (window.location.pathname === '/login' || window.location.pathname.startsWith('/shared/'))
          ) {
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);
            flushResolvers();
            return;
          }
          
          // 認証状態をチェック（ユーザー情報も含む）
          const authResponse = await apiFetch(buildApiUrl('/auth/protected'));

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
              // 期限情報が取得できる場合は期限前リフレッシュをスケジュール
              // サーバがexp(秒)やtokenExpを返さない場合は何もしない（心拍/可視化復帰でカバー）
              scheduleRefreshFromExp((authData.tokenExp as number | undefined) ?? (authData.exp as number | undefined) ?? null);
              
              // 認証成功時にpendingマイグレーションを実行
              await handlePendingMigration();
            } else {
              setUser(null);
              setIsAuthenticated(false);
              clearScheduledRefresh();
            }
          } else {
            setUser(null);
            setIsAuthenticated(false);
            clearScheduledRefresh();
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          setUser(null);
          setIsAuthenticated(false);
          clearScheduledRefresh();
        } finally {
          setIsLoading(false);
          flushResolvers();
        }
      }, 100);
    });
  }, [handlePendingMigration, scheduleRefreshFromExp, clearScheduledRefresh]);

  useEffect(() => {
    checkAuthStatusRef.current = checkAuthStatus;
  }, [checkAuthStatus]);

  // クリーンアップ時にタイマーもクリア
  useEffect(() => {
    return () => {
      if (checkAuthTimeoutRef.current) {
        clearTimeout(checkAuthTimeoutRef.current);
        checkAuthTimeoutRef.current = null;
      }
      checkAuthResolversRef.current.splice(0).forEach((resolver) => resolver());
    };
  }, []);

  // 定義済み

  /**
   * ログアウト処理
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiFetch(buildApiUrl('/auth/logout'), {
        method: 'POST',
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
  }, [checkAuthStatus]); // checkAuthStatusを依存配列に追加

  // 定期的な認証再検証
  useEffect(() => {
    if (!HEARTBEAT_MS || HEARTBEAT_MS <= 0) {
      return;
    }
    const intervalId = setInterval(() => {
      // タブが可視状態のときに優先してチェック（不可視でも最低限の同期は必要ならここで実行可）
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        checkAuthStatus();
      }
    }, HEARTBEAT_MS);

    return () => clearInterval(intervalId);
  }, [HEARTBEAT_MS, checkAuthStatus]);

  // タブ復帰（visibility/focus）時の即時再検証
  useEffect(() => {
    const handleVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'visible') {
        checkAuthStatus();
      }
    };
    const handleFocus = () => {
      checkAuthStatus();
    };

    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
      window.addEventListener('focus', handleFocus);
    }

    return () => {
      if (typeof window !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('focus', handleFocus);
      }
      clearScheduledRefresh();
    };
  }, [checkAuthStatus, clearScheduledRefresh]);

  // API層からの認証無効化通知に追随
  useEffect(() => {
    const unsubscribe = addAuthInvalidatedListener(() => {
      setUser(null);
      setIsAuthenticated(false);
      clearScheduledRefresh();
    });
    return () => {
      unsubscribe();
    };
  }, [clearScheduledRefresh]);

  return {
    isAuthenticated,
    user,
    isLoading,
    logout,
    refreshAuth,
  };
}
