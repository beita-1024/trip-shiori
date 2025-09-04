/**
 * テーマプロバイダークライアントコンポーネント
 * 
 * next-themesライブラリを使用してテーマ管理を行うクライアントサイドコンポーネントです。
 * システムテーマの自動検出とテーマ切り替え機能を提供します。
 * 
 * @param props.children - テーマプロバイダーでラップする子コンポーネント
 * @returns テーマプロバイダーコンポーネント
 * @example
 * <ThemeProviderClient>
 *   <App />
 * </ThemeProviderClient>
 */
"use client";

import { ThemeProvider } from "next-themes";
import React from "react";

/**
 * ThemeProviderClientコンポーネントのプロパティ型定義
 */
export interface ThemeProviderClientProps {
  /** テーマプロバイダーでラップする子コンポーネント */
  children: React.ReactNode;
}

export default function ThemeProviderClient({ children }: ThemeProviderClientProps): React.JSX.Element {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}
