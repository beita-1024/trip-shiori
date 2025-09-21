/**
 * デモ版ラベルコンポーネント
 * 
 * デモ版であることを示すラベルを表示します。
 * 右上に固定表示され、登録促進のメッセージも含みます。
 * 
 * @param props.onRegisterClick - 登録ボタンクリック時のハンドラー
 * @returns レンダリングされたDemoLabelコンポーネント
 * 
 * @example
 * <DemoLabel onRegisterClick={() => router.push('/register')} />
 */
"use client";

import React from "react";
import { Button } from "@/components/Primitives";

interface DemoLabelProps {
  onRegisterClick?: () => void;
}

export default function DemoLabel({ onRegisterClick }: DemoLabelProps) {
  return (
    <div className="fixed top-20 right-4 z-50 bg-orange-500 text-white px-3 py-2 rounded-lg shadow-lg border border-orange-600" data-tour="demo-label">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">デモ版</span>
        <span className="text-orange-100">|</span>
        <span className="text-xs">登録で全機能解放</span>
        {onRegisterClick && (
          <Button
            kind="ghost"
            onClick={onRegisterClick}
            className="text-white hover:bg-orange-600 text-xs px-2 py-1 h-auto"
          >
            登録
          </Button>
        )}
      </div>
    </div>
  );
}
