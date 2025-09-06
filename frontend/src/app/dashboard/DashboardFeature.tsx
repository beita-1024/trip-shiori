"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card, Heading, Button } from "@/components/Primitives";

/**
 * ダッシュボード機能のモックコンポーネント
 * 
 * ダッシュボードのモック版です。実際のダッシュボード機能は別Issueで実装予定です。
 * 現在はログイン後の導線として使用されます。
 * 
 * @returns レンダリングされたDashboardFeatureコンポーネント
 */
export default function DashboardFeature() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex items-center justify-center bg-app">
      <Card elevation={2} className="max-w-md mx-auto p-8 text-center">
        <div className="mb-4">
          <i className="mdi mdi-view-dashboard text-4xl text-muted mb-4" aria-hidden />
        </div>
        <Heading className="mb-6">ダッシュボード</Heading>
        
        <div className="mb-6">
          <p className="text-body mb-4">
            ダッシュボード機能は現在開発中です。
          </p>
          <p className="text-muted text-sm">
            ログイン機能と合わせて実装予定です。
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => router.push("/edit")}
            className="w-full"
          >
            旅程を編集する
          </Button>
          <Button
            kind="ghost"
            onClick={() => router.push("/")}
            className="w-full"
          >
            ホームに戻る
          </Button>
        </div>
      </Card>
    </main>
  );
}
