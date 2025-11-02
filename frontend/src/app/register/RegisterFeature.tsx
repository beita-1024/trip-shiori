"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Heading, FormField, InputWithPlaceholder, Button, SimpleForm } from "@/components/Primitives";
import { buildApiUrl } from "@/lib/api";

/**
 * 登録フォームのデータ型
 */
interface RegisterFormData {
  email: string;
  password: string;
  name: string;
}

/**
 * APIエラーレスポンスの型
 */
interface ApiError {
  error: string;
  message: string;
}

/**
 * ユーザー登録機能のメインコンポーネント
 * 
 * メールアドレスとパスワードでアカウント登録を行い、確認メール送信後に
 * ログインページへ遷移する機能を提供します。
 * 
 * 主な機能：
 * - フォームバリデーション（クライアント側）
 * - API連携（POST /auth/register）
 * - エラーハンドリング（400/409/500エラー）
 * - 成功時のUXフロー（確認メール送信メッセージ + ログインページ遷移）
 * - 二重送信防止（送信中はボタン無効化）
 * 
 * @returns レンダリングされたRegisterFeatureコンポーネント
 */
export default function RegisterFeature() {
  const router = useRouter();
  
  // フォーム状態
  const [formData, setFormData] = useState<RegisterFormData>({
    email: "",
    password: "",
    name: "",
  });
  
  // UI状態
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<RegisterFormData>>({});
  const [apiError, setApiError] = useState<string>("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  /**
   * フォームフィールドの値を更新する
   * 
   * @param field - 更新するフィールド名
   * @param value - 新しい値
   */
  const handleFieldChange = (field: keyof RegisterFormData, value: string) => {
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
  const validateForm = (data: RegisterFormData): Partial<RegisterFormData> => {
    const newErrors: Partial<RegisterFormData> = {};

    // メールアドレスの検証
    if (!data.email.trim()) {
      newErrors.email = "メールアドレスは必須です";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = "正しいメールアドレス形式で入力してください";
    }

    // パスワードの検証
    if (!data.password) {
      newErrors.password = "パスワードは必須です";
    } else if (data.password.length < 8) {
      newErrors.password = "パスワードは8文字以上で入力してください";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/.test(data.password)) {
      newErrors.password = "パスワードは大文字・小文字・数字・特殊文字を含む必要があります";
    }

    // 名前の検証
    if (!data.name.trim()) {
      newErrors.name = "お名前は必須です";
    }

    return newErrors;
  };


  /**
   * フォーム送信処理
   */
  const handleSubmit = async () => {
    // クライアント側バリデーション
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setApiError("");

    try {
      const response = await fetch(buildApiUrl('/auth/register'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
          name: formData.name.trim() || undefined,
        }),
      });

      if (response.status === 204) {
        // 登録成功
        setShowSuccessMessage(true);
        
        // NOTE: ログイン後に移行する（登録直後は未認証のため）
        const localItinerary = localStorage.getItem('itinerary');
        if (localItinerary) {
          sessionStorage.setItem('pendingLocalItinerary', localItinerary);
        }
        
        // 3秒後にログインページへ遷移
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        // エラーレスポンスの処理
        const contentType = response.headers.get("content-type");
        let errorData: Partial<ApiError> | null = null;
        let fallbackText = "";
        
        try {
          if (contentType?.includes("application/json")) {
            errorData = await response.json();
          } else {
            fallbackText = await response.text();
          }
        } catch {
          // 念のため握りつぶす（非JSON/空ボディ想定）
        }
        
        switch (response.status) {
          case 400:
            if (errorData?.error === "invalid_body") {
              setApiError("入力内容に誤りがあります。メールアドレスとパスワードの形式を確認してください。");
            } else {
              setApiError(errorData?.message || fallbackText || "入力内容に誤りがあります。");
            }
            break;
          case 409:
            setApiError("このメールアドレスは既に登録されています。");
            break;
          case 500:
            setApiError("サーバーエラーが発生しました。しばらく時間をおいて再度お試しください。");
            break;
          default:
            setApiError(errorData?.message || fallbackText || "登録に失敗しました。");
        }
      }
    } catch (error) {
      console.error("Registration error:", error);
      setApiError("ネットワークエラーが発生しました。インターネット接続を確認してください。");
    } finally {
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
          <Heading className="text-green-600 mb-4">登録完了</Heading>
          <p className="text-body mb-6">
            確認メールを送信しました。<br />
            メールをご確認いただき、認証リンクをクリックしてください。
          </p>
          <p className="text-muted text-sm">
            3秒後にログインページに移動します...
          </p>
          
        </Card>
      </section>
    );
  }

  return (
    <section className="min-h-screen flex items-center justify-center bg-app">
      <Card elevation={2} className="max-w-md mx-auto p-8">
        <Heading className="text-center mb-6">アカウント登録</Heading>
        
        <SimpleForm onSubmit={handleSubmit}>
          {/* メールアドレス */}
          <FormField label="メールアドレス" id="email" required>
            <InputWithPlaceholder
              id="email"
              type="email"
              placeholder="your@example.com"
              value={formData.email}
              onChange={(e) => handleFieldChange("email", e.target.value)}
              className={errors.email ? "border-red-500" : ""}
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.email}
              </p>
            )}
          </FormField>

          {/* パスワード */}
          <FormField label="パスワード" id="password" required>
            <InputWithPlaceholder
              id="password"
              type="password"
              placeholder="8文字以上（大文字・小文字・数字・特殊文字を含む）"
              value={formData.password}
              onChange={(e) => handleFieldChange("password", e.target.value)}
              className={errors.password ? "border-red-500" : ""}
              disabled={isSubmitting}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.password}
              </p>
            )}
          </FormField>

          {/* お名前 */}
          <FormField label="お名前" id="name" required>
            <InputWithPlaceholder
              id="name"
              type="text"
              placeholder="UserName"
              value={formData.name}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              className={errors.name ? "border-red-500" : ""}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.name}
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
            {isSubmitting ? "登録中..." : "登録する"}
          </Button>
        </SimpleForm>

        {/* ログインページへのリンク */}
        <div className="mt-6 text-center">
          <p className="text-muted text-sm">
            既にアカウントをお持ちの方は{" "}
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
