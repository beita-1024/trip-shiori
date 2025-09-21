"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LogoIcon } from "./LogoIcon";

/**
 * アプリケーションのロゴコンポーネント
 * 
 * アイコンとタイトル「AI旅のしおり」を表示し、クリック時のナビゲーション機能を提供します。
 * ログインユーザーは旅程一覧ページへ、非ログインユーザーはトップページへ遷移します。
 * 
 * @param props.className - 追加のCSSクラス
 * @param props.showTitle - タイトルを表示するかどうか（デフォルト: true）
 * @returns ロゴコンポーネント
 * 
 * @example
 * <Logo className="hover:opacity-80" />
 * <Logo showTitle={false} className="text-blue-500" />
 */
interface LogoProps {
  className?: string;
  showTitle?: boolean;
}

export function Logo({ className = "", showTitle = true }: LogoProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  /**
   * ロゴクリック時のナビゲーション処理
   */
  const handleLogoClick = () => {
    if (isAuthenticated) {
      // ログインユーザーは旅程一覧ページへ
      router.push("/itineraries");
    } else {
      // 非ログインユーザーはトップページへ
      router.push("/");
    }
  };

  return (
    <button
      onClick={handleLogoClick}
      className={`
        flex items-center gap-2 
        text-lg font-medium 
        text-accent hover:text-accent/80 
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-accent/20 focus:ring-offset-2
        rounded-md px-1 py-1
        ${className}
      `}
      aria-label="ホームに戻る"
    >
      <LogoIcon size={28} className="text-accent" />
      {showTitle && (
        <span className="hidden sm:inline">
          AI旅のしおり
        </span>
      )}
    </button>
  );
}
