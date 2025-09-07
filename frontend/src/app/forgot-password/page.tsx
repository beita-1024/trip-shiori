"use client";
import React from "react";
import ForgotPasswordFeature from "./ForgotPasswordFeature";

/**
 * パスワードリセット要求ページ
 * 
 * メールアドレスを入力してパスワードリセットメールを送信するページコンポーネントです。
 * ForgotPasswordFeatureコンポーネントをラップして、ページレベルの機能を提供します。
 * 
 * @returns パスワードリセット要求ページのレンダリング結果
 */
export default function ForgotPasswordPage() {
  return <ForgotPasswordFeature />;
}
