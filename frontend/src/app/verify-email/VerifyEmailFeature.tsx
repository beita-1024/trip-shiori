"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Heading } from "@/components/Primitives";

/**
 * メール認証機能のメインコンポーネント
 * 
 * URLパラメータからuidとtokenを取得し、バックエンドのメール認証APIを呼び出します。
 * 認証成功時はログイン画面へリダイレクトし、失敗時はエラーメッセージを表示します。
 * 
 * 主な機能：
 * - URLパラメータの解析（uid, token）
 * - メール認証API呼び出し（GET /auth/verify-email）
 * - 認証成功時のログイン画面リダイレクト
 * - エラーハンドリング（無効トークン、ネットワークエラー等）
 * - ローディング状態の表示
 * 
 * @returns レンダリングされたVerifyEmailFeatureコンポーネント
 */
export default function VerifyEmailFeature() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 状態管理
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // URLパラメータからuidとtokenを取得
        const uid = searchParams.get('uid');
        const token = searchParams.get('token');

        if (!uid || !token) {
          setError("認証情報が不足しています。メールのリンクを正しくクリックしてください。");
          setIsVerifying(false);
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002';
        
        // デバッグ情報（開発環境のみ）
        if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
          console.log('Verifying email with:', { uid, token: token.substring(0, 10) + '...' });
        }

        // メール認証APIを呼び出し
        const response = await fetch(`${apiUrl}/auth/verify-email?uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}`, {
          method: 'GET',
          credentials: 'include', // Cookieを受け取るために必要
        });

        if (response.ok) {
          // 認証成功
          setIsSuccess(true);
          setError("");
          
          // 2秒後にログイン画面へリダイレクト
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        } else {
          // エラーレスポンスの処理
          const contentType = response.headers.get("content-type");
          let errorData: any = null;
          let fallbackText = "";
          
          try {
            if (contentType?.includes("application/json")) {
              errorData = await response.json();
            } else {
              fallbackText = await response.text();
            }
          } catch {
            // 念のため握りつぶす
          }
          
          switch (response.status) {
            case 400:
              if (errorData?.error === 'invalid_token') {
                setError("認証トークンが無効または期限切れです。再度登録を行ってください。");
              } else if (errorData?.error === 'user_not_found') {
                setError("ユーザーが見つかりません。再度登録を行ってください。");
              } else {
                setError(errorData?.message || fallbackText || "認証に失敗しました。");
              }
              break;
            case 500:
              setError("サーバーエラーが発生しました。しばらく時間をおいて再度お試しください。");
              break;
            default:
              setError(errorData?.message || fallbackText || "認証に失敗しました。");
          }
        }
      } catch (error) {
        console.error("Email verification error:", error);
        setError("ネットワークエラーが発生しました。インターネット接続を確認してください。");
      } finally {
        setIsVerifying(false);
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  // 認証成功時の表示
  if (isSuccess) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-app">
        <Card elevation={2} className="max-w-md mx-auto p-8 text-center">
          <div className="mb-4">
            <i className="mdi mdi-check-circle text-4xl text-green-600 mb-4" aria-hidden />
          </div>
          <Heading className="text-green-600 mb-4">メール認証完了</Heading>
          <p className="text-body mb-6">
            メールアドレスの認証が完了しました。<br />
            ログイン画面に移動します...
          </p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
          </div>
        </Card>
      </section>
    );
  }

  // エラー時の表示
  if (error) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-app">
        <Card elevation={2} className="max-w-md mx-auto p-8 text-center">
          <div className="mb-4">
            <i className="mdi mdi-alert-circle text-4xl text-red-600 mb-4" aria-hidden />
          </div>
          <Heading className="text-red-600 mb-4">認証エラー</Heading>
          <p className="text-body mb-6">
            {error}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/register')}
              className="w-full bg-accent text-white py-2 px-4 rounded-md hover:bg-accent-hover transition-colors"
            >
              再度登録する
            </button>
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
            >
              ログイン画面へ
            </button>
          </div>
        </Card>
      </section>
    );
  }

  // 認証中の表示
  return (
    <section className="min-h-screen flex items-center justify-center bg-app">
      <Card elevation={2} className="max-w-md mx-auto p-8 text-center">
        <div className="mb-4">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        </div>
        <Heading className="mb-4">メール認証中</Heading>
        <p className="text-body">
          メールアドレスの認証を行っています。<br />
          しばらくお待ちください...
        </p>
      </Card>
    </section>
  );
}
