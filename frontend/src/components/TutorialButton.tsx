/**
 * チュートリアル再受講ボタンコンポーネント
 * 
 * ヘッダーに表示されるチュートリアル再受講ボタンです。
 * ルートページ（/）と/editページ（:idなし）でのみ表示されます。
 * クリックするとチュートリアルを再実行できます。
 * 
 * @returns レンダリングされたTutorialButtonコンポーネント（条件付き）
 * 
 * @example
 * <TutorialButton />
 */
"use client";

import React from "react";
import { useTutorial } from "@/hooks/useTutorial";
import { usePathname } from "@/hooks/usePathname";

export default function TutorialButton() {
  const { TutorialButton: TutorialButtonComponent } = useTutorial();
  const pathname = usePathname();
  
  // ルートページ（/）と/editページ（:idなし）でのみ表示
  if (pathname !== '/' && pathname !== '/edit') {
    return null;
  }
  
  return <TutorialButtonComponent />;
}
