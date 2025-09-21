/**
 * 認証ボタンコンポーネント
 * 
 * 認証状態に応じてログイン・登録・ログアウトボタンを表示します。
 * ログイン中はユーザー名を表示し、ログアウトボタンを提供します。
 * 未ログイン時はログイン・登録ボタンを表示します。
 * 
 * @example
 * <AuthButtons />
 */
"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/Primitives';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/Primitives';

export default function AuthButtons(): React.JSX.Element {
  const router = useRouter();
  const { isAuthenticated, user, isLoading, logout } = useAuth();

  /**
   * ログインページに遷移
   */
  const handleLogin = (): void => {
    router.push('/login');
  };

  /**
   * 登録ページに遷移
   */
  const handleRegister = (): void => {
    router.push('/register');
  };

  /**
   * ログアウト処理
   */
  const handleLogout = async (): Promise<void> => {
    await logout();
  };

  // ローディング中はスピナーを表示
  if (isLoading) {
    return (
      <div className="flex items-center gap-2" role="status" aria-live="polite">
        <Spinner size="sm" />
        <span className="text-sm text-muted hidden sm:inline">読み込み中...</span>
        <span className="sr-only sm:hidden">読み込み中...</span>
      </div>
    );
  }

  // ログイン済みの場合
  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-3">
        {/* ユーザー名表示 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-body font-medium hidden sm:inline">
            こんにちは、{user.name}さん
          </span>
          <span className="text-sm text-body font-medium sm:hidden">
            {user.name}
          </span>
        </div>
        
        {/* ログアウトボタン */}
        <Button 
          kind="destructive" 
          onClick={handleLogout}
          className="text-sm"
          title="ログアウト"
          aria-label="ログアウト"
        >
          <i className="mdi mdi-logout sm:hidden" />
          <span className="hidden sm:inline">ログアウト</span>
        </Button>
      </div>
    );
  }

  // 未ログインの場合
  return (
    <div className="flex items-center gap-2">
      <Button 
        kind="ghost" 
        onClick={handleLogin}
        className="text-sm"
        title="ログイン"
        aria-label="ログイン"
      >
        <i className="mdi mdi-login sm:hidden" />
        <span className="hidden sm:inline">ログイン</span>
      </Button>
      <Button 
        kind="primary" 
        onClick={handleRegister}
        className="text-sm"
        title="登録"
        aria-label="登録"
      >
        <i className="mdi mdi-account-plus sm:hidden" />
        <span className="hidden sm:inline">登録</span>
      </Button>
    </div>
  );
}
