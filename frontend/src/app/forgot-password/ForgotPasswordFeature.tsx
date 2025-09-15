"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Heading, FormField, InputWithPlaceholder, Button, SimpleForm } from "@/components/Primitives";
import { buildApiUrl } from "@/lib/api";

/**
 * パスワードリセット要求フォームのデータ型
 */
interface ForgotPasswordFormData {
  email: string;
}

/**
 * パスワードリセット要求機能のメインコンポーネント
 * 
 * メールアドレスを入力してパスワードリセットメールを送信する機能を提供します。
 * ユーザー列挙耐性のため、常に204 No Contentを返し、成功・失敗に関わらず
 * 同じメッセージを表示します。
 * 
 * 主な機能：
 * - フォームバリデーション（クライアント側）
 * - API連携（POST /auth/password-reset/request）
 * - エラーハンドリング（429レート制限のみ特別扱い）
 * - 成功時のUXフロー（完了メッセージ表示）
 * - 二重送信防止（送信中はボタン無効化）
 * 
 * @returns レンダリングされたForgotPasswordFeatureコンポーネント
 */
export default function ForgotPasswordFeature() {
  const router = useRouter();
  
  // フォーム状態
  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: "",
  });
  
  // UI状態
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<ForgotPasswordFormData>>({});
  const [apiError, setApiError] = useState<string>("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  /**
   * フォームフィールドの値を更新する
   * 
   * @param field - 更新するフィールド名
   * @param value - 新しい値
   */
  const handleFieldChange = (field: keyof ForgotPasswordFormData, value: string) => {
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
  const validateForm = (data: ForgotPasswordFormData): Partial<ForgotPasswordFormData> => {
    const newErrors: Partial<ForgotPasswordFormData> = {};

    // メールアドレスの検証
    if (!data.email.trim()) {
      newErrors.email = "メールアドレスは必須です";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = "正しいメールアドレス形式で入力してください";
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
    let timeoutId: number | undefined;
    const controller = new AbortController();
    try {
      timeoutId = window.setTimeout(() => controller.abort(), 10000); // 10秒で中断
      
      const response = await fetch(buildApiUrl('/auth/password-reset/request'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim(),
        }),
        signal: controller.signal,
      });

      if (response.status === 204) {
        // 成功時：完了メッセージを表示（ユーザー列挙耐性のため常に同じメッセージ）
        setShowSuccessMessage(true);
      } else {
        // エラーレスポンスの処理
        switch (response.status) {
          case 429:
            setApiError("リクエストが多すぎます。しばらく時間をおいて再度お試しください。");
            break;
          default:
            // その他のエラーは一般化メッセージを表示
            setApiError("送信に失敗しました。しばらく時間をおいて再度お試しください。");
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setApiError("リクエストがタイムアウトしました。ネットワーク状況を確認して再度お試しください。");
      } else {
        console.error("Password reset request error:", error);
        setApiError("ネットワークエラーが発生しました。インターネット接続を確認してください。");
      }
    } finally {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      setIsSubmitting(false);
    }
  };

  // 成功メッセージ表示中の場合
  if (showSuccessMessage) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-app">
        <Card elevation={2} className="max-w-md mx-auto p-8 text-center">
          <div className="mb-4">
            <i className="mdi mdi-email-check text-4xl text-green-600 mb-4" aria-hidden />
          </div>
          <Heading className="text-green-600 mb-4">送信完了</Heading>
          <p className="text-body mb-6">
            送信しました。メールをご確認ください。
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => router.push("/login")}
              className="w-full"
            >
              ログインページに戻る
            </Button>
            <Button
              kind="ghost"
              onClick={() => {
                setShowSuccessMessage(false);
                setFormData({ email: "" });
              }}
              className="w-full"
            >
              もう一度送信する
            </Button>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="min-h-screen flex items-center justify-center bg-app">
      <Card elevation={2} className="max-w-md mx-auto p-8">
        <div className="mb-4 text-center">
          <i className="mdi mdi-lock-reset text-4xl text-muted mb-4" aria-hidden />
        </div>
        <Heading className="text-center mb-6">パスワードリセット</Heading>
        
        <div className="mb-6">
          <p className="text-body text-sm">
            登録されているメールアドレスを入力してください。<br />
            パスワードリセット用のメールをお送りします。
          </p>
        </div>
        
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
            {isSubmitting ? "送信中..." : "送信する"}
          </Button>
        </SimpleForm>

        {/* ログインページへのリンク */}
        <div className="mt-6 text-center">
          <p className="text-muted text-sm">
            パスワードを思い出した方は{" "}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-accent hover:text-accent-hover underline"
              disabled={isSubmitting}
            >
              こちらからログイン
            </button>
          </p>
        </div>
      </Card>
    </section>
  );
}
