"use client";

import { usePathname } from 'next/navigation';
import AuthButtons from './AuthButtons';

/**
 * 条件付き認証ボタンコンポーネント
 * 
 * ログインページや登録ページでは認証状態のチェックを行わず、
 * 他のページでは通常のAuthButtonsを表示します。
 * これにより、ログインページでの無限リダイレクトを防ぎます。
 * 
 * @returns 条件に応じた認証ボタンコンポーネント
 */
export default function ConditionalAuthButtons() {
  const pathname = usePathname();
  
  // ログイン・登録・パスワードリセットページでは認証状態チェックを無効化
  const isAuthPage = pathname === '/login' || 
                    pathname === '/register' || 
                    pathname === '/forgot-password' ||
                    pathname === '/reset-password' ||
                    pathname.startsWith('/verify-email');
  
  if (isAuthPage) {
    // 認証ページでは静的なボタンを表示（認証状態チェックなし）
    return (
      <div className="flex items-center gap-2">
        <div className="text-sm text-muted">
          {pathname === '/login' && 'ログイン中...'}
          {pathname === '/register' && '登録中...'}
          {pathname === '/forgot-password' && 'パスワードリセット中...'}
          {pathname === '/reset-password' && 'パスワード再設定中...'}
          {pathname.startsWith('/verify-email') && 'メール認証中...'}
        </div>
      </div>
    );
  }
  
  // その他のページでは通常のAuthButtonsを表示
  return <AuthButtons />;
}
