"use client";

import React from "react";
import { Card, Button } from "@/components/Primitives";

/**
 * 操作パネルセクション
 * 
 * 旅程のリセットなどの操作機能を提供します。
 * 
 * @param props.onResetItinerary - 旅程リセットハンドラー
 * @returns レンダリングされたActionPanelコンポーネント
 */
interface ActionPanelProps {
  onResetItinerary: () => void;
}

export default function ActionPanel({ onResetItinerary }: ActionPanelProps) {
  return (
    <Card elevation={1} className="max-w-2xl mx-auto mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex flex-col gap-2 w-full">
          <div className="flex gap-2 items-center">
            <Button
              kind="ghost"
              type="button"
              data-tour="reset-button"
              onClick={() => {
                if (window.confirm("本当にデフォルトに戻しますか？現在の変更は失われます。よろしいですか？")) {
                  onResetItinerary();
                }
              }}
            >
              <i className="mdi mdi-restore mr-2" />
              デフォルトに戻す
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
