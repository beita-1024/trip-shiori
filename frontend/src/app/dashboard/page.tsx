"use client";
import React from "react";
import DashboardFeature from "./DashboardFeature";

/**
 * ダッシュボードページ
 * 
 * ログイン後のメインダッシュボードページコンポーネントです。
 * DashboardFeatureコンポーネントをラップして、ページレベルの機能を提供します。
 * 
 * @returns ダッシュボードページのレンダリング結果
 */
export default function DashboardPage() {
  return <DashboardFeature />;
}
