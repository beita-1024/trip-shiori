"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Heading, FormField, InputWithPlaceholder, Button, SimpleForm } from "@/components/Primitives";

/**
 * パスワード再設定フォームのデータ型
 */
interface ResetPasswordFormData {
  newPassword: string;
  confirmPassword: string;
}

/**
 * パスワード再設定機能のメインコンポーネント
 * 
 * メールのリンクから遷移してくるパスワード再設定画面を提供します。
 * クエリパラメータでuidとtokenを受け取り、新しいパスワードを設定できます。
 * 
 * 主な機能：
 * - クエリパラメータの検証（uid, token）
 * - フォームバリデーション（クライアント側）
 * - API連携（POST /auth/password-reset/confirm）
 * - エラーハンドリング（400, 429エラー対応）
 * - 成功時のUXフロー（完了メッセージ表示）
 * - 二重送信防止（送信中はボタン無効化）
 * 
 * @returns レンダリングされたResetPasswordFeatureコンポーネント
 */
export default function ResetPasswordFeature() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // クエリパラメータの取得
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');
  
  // フォーム状態
  const [formData, setFormData] = useState<ResetPasswordFormData>({
    newPassword: "",
    confirmPassword: "",
  });
  
  // UI状態
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<ResetPasswordFormData>>({});
  const [apiError, setApiError] = useState<string>("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [queryError, setQueryError] = useState<string>("");

  /**
   * クエリパラメータの検証
   */
  useEffect(() => {
    if (!uid || !token) {
      setQueryError("無効なリンクです。メールから正しいリンクをクリックしてください。");
    }
  }, [uid, token]);

  /**
   * フォームフィールドの値を更新する
   * 
   * @param field - 更新するフィールド名
   * @param value - 新しい値
   */
  const handleFieldChange = (field: keyof ResetPasswordFormData, value: string) => {
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
   * パスワード強度の検証
   * 
   * @param password - 検証するパスワード
   * @returns エラーメッセージ（問題がない場合は空文字）
   */
  const validatePasswordStrength = (password: string): string => {
    if (password.length < 8) {
      return "パスワードは8文字以上である必要があります";
    }
    if (!/[A-Z]/.test(password)) {
      return "大文字を含める必要があります";
    }
    if (!/[a-z]/.test(password)) {
      return "小文字を含める必要があります";
    }
    if (!/\d/.test(password)) {
      return "数字を含める必要があります";
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return "特殊文字を含める必要があります";
    }
    return "";
  };

  /**
   * クライアント側バリデーション
   * 
   * @param data - バリデーション対象のフォームデータ
   * @returns バリデーションエラーのマップ
   */
  const validateForm = (data: ResetPasswordFormData): Partial<ResetPasswordFormData> => {
    const newErrors: Partial<ResetPasswordFormData> = {};

    // 新しいパスワードの検証
    if (!data.newPassword.trim()) {
      newErrors.newPassword = "新しいパスワードは必須です";
    } else {
      const passwordError = validatePasswordStrength(data.newPassword);
      if (passwordError) {
        newErrors.newPassword = passwordError;
      }
    }

    // 確認パスワードの検証
    if (!data.confirmPassword.trim()) {
      newErrors.confirmPassword = "確認パスワードは必須です";
    } else if (data.newPassword !== data.confirmPassword) {
      newErrors.confirmPassword = "パスワードが一致しません";
    }

    return newErrors;
  };

  /**
   * フォーム送信処理
   */
  const handleSubmit = async () => {
    if (isSubmitting) return; // 二重送信を早期にガード
    
    // クエリパラメータの検証
    if (!uid || !token) {
      setQueryError("無効なリンクです。メールから正しいリンクをクリックしてください。");
      return;
    }
    
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
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002';
      
      // デバッグ情報（開発環境のみ）
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.log('API URL:', apiUrl);
        // 機微情報はログ出力しない
        console.log('Request meta:', { hasUid: Boolean(uid), tokenLength: token?.length ?? 0 });
      }
      
      const response = await fetch(`${apiUrl}/auth/password-reset/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid,
          token,
          newPassword: formData.newPassword,
        }),
        signal: controller.signal,
      });

      if (response.status === 204) {
        // 成功時：完了メッセージを表示
        setShowSuccessMessage(true);
      } else {
        // エラーレスポンスの処理
        switch (response.status) {
          case 400:
            setApiError("無効なトークンまたは期限切れです。再度パスワードリセットを申請してください。");
            break;
          case 429:
            setApiError("リクエストが多すぎます。しばらく時間をおいて再度お試しください。");
            break;
          default:
            // その他のエラーは一般化メッセージを表示
            setApiError("パスワードの再設定に失敗しました。しばらく時間をおいて再度お試しください。");
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setApiError("リクエストがタイムアウトしました。ネットワーク状況を確認して再度お試しください。");
      } else {
        console.error("Password reset confirmation error:", error);
        setApiError("ネットワークエラーが発生しました。インターネット接続を確認してください。");
      }
    } finally {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      setIsSubmitting(false);
    }
  };

  // クエリパラメータエラーがある場合
  if (queryError) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-app">
        <Card elevation={2} className="max-w-md mx-auto p-8 text-center">
          <div className="mb-4">
            <i className="mdi mdi-alert-circle text-4xl text-red-600 mb-4" aria-hidden />
          </div>
          <Heading className="text-red-600 mb-4">エラー</Heading>
          <p className="text-body mb-6">
            {queryError}
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => router.push("/forgot-password")}
              className="w-full"
            >
              パスワードリセットを申請する
            </Button>
            <Button
              kind="ghost"
              onClick={() => router.push("/login")}
              className="w-full"
            >
              ログインページに戻る
            </Button>
          </div>
        </Card>
      </section>
    );
  }

  // 成功メッセージ表示中の場合
  if (showSuccessMessage) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-app">
        <Card elevation={2} className="max-w-md mx-auto p-8 text-center">
          <div className="mb-4">
            <i className="mdi mdi-check-circle text-4xl text-green-600 mb-4" aria-hidden />
          </div>
          <Heading className="text-green-600 mb-4">再設定完了</Heading>
          <p className="text-body mb-6">
            パスワードの再設定が完了しました。<br />
            新しいパスワードでログインしてください。
          </p>
          <Button
            onClick={() => router.push("/login")}
            className="w-full"
          >
            ログインページに移動
          </Button>
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
        <Heading className="text-center mb-6">パスワード再設定</Heading>
        
        <div className="mb-6">
          <p className="text-body text-sm">
            新しいパスワードを入力してください。<br />
            パスワードは8文字以上で、大文字・小文字・数字・特殊文字を含む必要があります。
          </p>
        </div>
        
        <SimpleForm onSubmit={handleSubmit}>
          {/* 新しいパスワード */}
          <FormField label="新しいパスワード" id="newPassword" required>
            <InputWithPlaceholder
              id="newPassword"
              type="password"
              placeholder="新しいパスワードを入力"
              value={formData.newPassword}
              onChange={(e) => handleFieldChange("newPassword", e.target.value)}
              name="newPassword"
              autoComplete="new-password"
              aria-invalid={!!errors.newPassword}
              aria-describedby={errors.newPassword ? "newPassword-error" : undefined}
              className={errors.newPassword ? "border-red-500" : ""}
              disabled={isSubmitting}
            />
            {errors.newPassword && (
              <p id="newPassword-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.newPassword}
              </p>
            )}
          </FormField>

          {/* 確認パスワード */}
          <FormField label="確認パスワード" id="confirmPassword" required>
            <InputWithPlaceholder
              id="confirmPassword"
              type="password"
              placeholder="パスワードを再入力"
              value={formData.confirmPassword}
              onChange={(e) => handleFieldChange("confirmPassword", e.target.value)}
              name="confirmPassword"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
              className={errors.confirmPassword ? "border-red-500" : ""}
              disabled={isSubmitting}
            />
            {errors.confirmPassword && (
              <p id="confirmPassword-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.confirmPassword}
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
            {isSubmitting ? "設定中..." : "パスワードを設定"}
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
