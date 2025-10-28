"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { requireAuth } from '@/lib/auth';

/**
 * 認証が必要なページで自動的にログイン画面にリダイレクトするフック
 * 
 * 認証状態をチェックし、未認証の場合は自動的にログイン画面にリダイレクトします。
 * ログイン後の元のページへのリダイレクトもサポートします。
 * 
 * @param redirectToLogin - 未認証時にログイン画面にリダイレクトするかどうか（デフォルト: true）
 *                          falseの場合、認証状態はチェックするがリダイレクトは行わない
 * @returns 認証状態とローディング状態
 * 
 * @example
 * ```tsx
 * // 認証必須ページ（未認証時はログイン画面にリダイレクト）
 * const { isAuthenticated, isLoading } = useAuthRedirect();
 * if (isLoading) return <Spinner />;
 * if (!isAuthenticated) return null; // リダイレクト中
 * return <div>認証済みコンテンツ</div>;
 * ```
 * 
 * @example
 * ```tsx
 * // 認証状態のみチェック（リダイレクトなし）
 * const { isAuthenticated, isLoading } = useAuthRedirect(false);
 * if (isAuthenticated) {
 *   // ログイン済みユーザー向けの処理
 * } else {
 *   // 非ログインユーザー向けの処理
 * }
 * ```
 */
export function useAuthRedirect(redirectToLogin: boolean = true) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // redirectToLoginがfalseの場合は認証チェックのみ実行（リダイレクトはスキップ）
        if (!redirectToLogin) {
          console.log('useAuthRedirect: redirectToLogin=false, checking auth without redirect');
          const authStatus = await requireAuth();
          console.log('useAuthRedirect: auth check result:', authStatus);
          setIsAuthenticated(authStatus);
          setIsLoading(false);
          return;
        }
        
        console.log('useAuthRedirect: redirectToLogin=true, checking auth');
        const authStatus = await requireAuth();
        setIsAuthenticated(authStatus);
        
        if (!authStatus && redirectToLogin) {
          // 現在のパスをクエリパラメータとして保存
          const redirectUrl = encodeURIComponent(pathname);
          router.push(`/login?redirect=${redirectUrl}`);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        if (redirectToLogin) {
          router.push('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndRedirect();
  }, [router, pathname, redirectToLogin]);

  return { isAuthenticated, isLoading };
}
