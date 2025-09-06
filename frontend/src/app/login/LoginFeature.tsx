"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card, Heading, Button } from "@/components/Primitives";

/**
 * ログイン機能のモックコンポーネント
 * 
 * ログイン画面のモック版です。実際のログイン機能は別Issueで実装予定です。
 * 現在は登録完了後の導線として使用されます。
 * 
 * @returns レンダリングされたLoginFeatureコンポーネント
 */
export default function LoginFeature() {
  const router = useRouter();

  return (
    <section className="min-h-screen flex items-center justify-center bg-app">
      <Card elevation={2} className="max-w-md mx-auto p-8 text-center">
        <div className="mb-4">
          <i className="mdi mdi-login text-4xl text-muted mb-4" aria-hidden />
        </div>
        <Heading className="mb-6">ログイン</Heading>
        
        <div className="mb-6">
          <p className="text-body mb-4">
            ログイン機能は現在開発中です。
          </p>
          <p className="text-muted text-sm">
            登録完了後、メール認証を行ってください。
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => router.push("/register")}
            className="w-full"
          >
            登録ページに戻る
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
    </section>
  );
}
