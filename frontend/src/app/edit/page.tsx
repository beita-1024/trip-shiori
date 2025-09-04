"use client";
import React from "react";
import EditFeature from "./EditFeature";

/**
 * 新規旅程編集ページ
 * 
 * 新しい旅程を作成・編集するためのページコンポーネントです。
 * EditFeatureコンポーネントをラップして、ページレベルの機能を提供します。
 * 
 * @returns 新規編集ページのレンダリング結果
 */
export default function NewEditPage() {
  return <EditFeature />;
}