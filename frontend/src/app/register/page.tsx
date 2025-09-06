"use client";
import React from "react";
import RegisterFeature from "./RegisterFeature";

/**
 * ユーザー登録ページ
 * 
 * メールアドレスとパスワードでアカウント登録を行うページコンポーネントです。
 * RegisterFeatureコンポーネントをラップして、ページレベルの機能を提供します。
 * 
 * @returns ユーザー登録ページのレンダリング結果
 */
export default function RegisterPage() {
  return <RegisterFeature />;
}
