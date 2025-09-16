"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Heading, FormField, InputWithPlaceholder, Button, SimpleForm } from "@/components/Primitives";
import { buildApiUrl } from "@/lib/api";

/**
 * ログインフォームのデータ型
 */
interface LoginFormData {
  email: string;
  password: string;
}

/**
 * ユーザーログイン機能のメインコンポーネント
 * 
 * メールアドレスとパスワードでログインを行い、サーバーからのHttpOnly Cookieを受け取って
 * 旅程一覧ページへ遷移する機能を提供します。
 * 
 * 主な機能：
 * - フォームバリデーション（クライアント側）
 * - API連携（POST /auth/login）
 * - エラーハンドリング（400/401/403エラー）
 * - 成功時のUXフロー（リダイレクト先または旅程一覧ページ遷移）
 * - 二重送信防止（送信中はボタン無効化）
 * 
 * @returns レンダリングされたLoginFeatureコンポーネント
 */
export default function LoginFeature() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // フォーム状態
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  
  // UI状態
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [apiError, setApiError] = useState<string>("");
  
  // リダイレクト先の取得
  const redirectTo = searchParams.get('redirect');

  /**
   * フォームフィールドの値を更新する
   * 
   * @param field - 更新するフィールド名
   * @param value - 新しい値
   */
  const handleFieldChange = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // フィールド変更時にエラーをクリア
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    if (apiError) {
      setApiError("");
    }
  };

  /**
   * クライアント側バリデーション
   * 
   * @param data - バリデーション対象のフォームデータ
   * @returns バリデーションエラーのマップ
   */
  const validateForm = (data: LoginFormData): Partial<LoginFormData> => {
    const newErrors: Partial<LoginFormData> = {};

    // メールアドレスの検証
    if (!data.email.trim()) {
      newErrors.email = "メールアドレスは必須です";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = "正しいメールアドレス形式で入力してください";
    }

    // パスワードの検証
    if (!data.password) {
      newErrors.password = "パスワードは必須です";
    }

    return newErrors;
  };

  /**
   * フォーム送信処理
   */
  const handleSubmit = async () => {
    if (isSubmitting) return; // 二重送信を早期にガード
    
    // クライアント側バリデーション
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setApiError("");

    // タイムアウト/中断の設定
    // INFO: fetch はデフォルトでタイムアウトがなく、ネットワーク不調時にUIが固まりがちなので、タイムアウトを設定
    let timeoutId: number | undefined;
    const controller = new AbortController();
    try {
      timeoutId = window.setTimeout(() => controller.abort(), 10000); // 10秒で中断
      
      const response = await fetch(buildApiUrl('/auth/login'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
        credentials: 'include', // HttpOnly Cookieを受け取るために必要
        signal: controller.signal,
      });

      if (response.status === 204) {
        // ログイン成功 - リダイレクト先または旅程一覧ページへ遷移
        const destination = isSafeInternalPath(redirectTo) ? redirectTo! : "/itineraries";
        router.push(destination);
      } else {
        // エラーレスポンスの処理
        switch (response.status) {
          case 400:
            setApiError("入力内容に誤りがあります。メールアドレスとパスワードの形式を確認してください。");
            break;
          case 401:
          case 403:
            setApiError("メールアドレスまたはパスワードが違います。");
            break;
          default:
            setApiError("ログインに失敗しました。しばらく時間をおいて再度お試しください。");
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setApiError("リクエストがタイムアウトしました。ネットワーク状況を確認して再度お試しください。");
      } else {
        console.error("Login error:", error);
        setApiError("ネットワークエラーが発生しました。インターネット接続を確認してください。");
      }
    } finally {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      setIsSubmitting(false);
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-app">
      <Card elevation={2} className="max-w-md mx-auto p-8">
        <div className="mb-4 text-center">
          <i className="mdi mdi-login text-4xl text-muted mb-4" aria-hidden />
        </div>
        <Heading className="text-center mb-6">ログイン</Heading>
        
        <SimpleForm onSubmit={handleSubmit}>
          {/* メールアドレス */}
          <FormField label="メールアドレス" id="email" required>
            <InputWithPlaceholder
              id="email"
              type="email"
              placeholder="your@example.com"
              value={formData.email}
              onChange={(e) => handleFieldChange("email", e.target.value)}
              name="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={errors.email ? "border-red-500" : ""}
              disabled={isSubmitting}
            />
            {errors.email && (
              <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.email}
              </p>
            )}
          </FormField>

          {/* パスワード */}
          <FormField label="パスワード" id="password" required>
            <InputWithPlaceholder
              id="password"
              type="password"
              placeholder="パスワードを入力してください"
              value={formData.password}
              onChange={(e) => handleFieldChange("password", e.target.value)}
              name="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              className={errors.password ? "border-red-500" : ""}
              disabled={isSubmitting}
            />
            {errors.password && (
              <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.password}
              </p>
            )}
          </FormField>

          {/* APIエラー表示 */}
          {apiError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600" role="alert">
                {apiError}
              </p>
            </div>
          )}

          {/* 送信ボタン */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "ログイン中..." : "ログイン"}
          </Button>
        </SimpleForm>

        {/* 登録ページへのリンク */}
        <div className="mt-6 text-center">
          <p className="text-muted text-sm">
            アカウントをお持ちでない方は{" "}
            <button
              type="button"
              onClick={() => router.push("/register")}
              className="text-accent hover:text-accent-hover underline"
              disabled={isSubmitting}
            >
              こちらから登録
            </button>
          </p>
        </div>

        {/* パスワードリセットページへのリンク */}
        <div className="mt-3 text-center">
          <p className="text-muted text-sm">
            パスワードを忘れた方は{" "}
            <button
              type="button"
              onClick={() => router.push("/forgot-password")}
              className="text-accent hover:text-accent-hover underline"
              disabled={isSubmitting}
            >
              こちらからリセット
            </button>
          </p>
        </div>
      </Card>
    </section>
  );
}

/**
 * 内部パスかどうかを安全にチェックする関数
 * 
 * オープンリダイレクト攻撃を防ぐため、内部パスのみを許可します。
 * 
 * @param path - チェックするパス
 * @returns 内部パスの場合はtrue、そうでなければfalse
 */
function isSafeInternalPath(path: string | null): boolean {
  if (!path) return false;
  // 内部のみ（先頭が単一の `/` で `//` やプロトコル、スキームは不許可）
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  const lower = path.toLowerCase();
  return !(lower.startsWith("/http:") || lower.startsWith("/https:") || lower.startsWith("/javascript:"));
}
