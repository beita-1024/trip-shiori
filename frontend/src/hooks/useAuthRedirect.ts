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
 * @returns 認証状態とローディング状態
 * 
 * @example
 * ```tsx
 * function ProtectedPage() {
 *   const { isAuthenticated, isLoading } = useAuthRedirect();
 *   
 *   if (isLoading) return <Spinner />;
 *   if (!isAuthenticated) return null; // リダイレクト中
 *   
 *   return <div>認証済みコンテンツ</div>;
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
