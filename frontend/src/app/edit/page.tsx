"use client";
import React from "react";
import EditFeature from "./EditFeature";

/**
 * 非ログインユーザー用の旅程編集ページ
 * 
 * ログインしていないユーザーが旅程を編集するためのページです。
 * ローカルストレージに保存され、サーバーには保存されません。
 * 
 * @returns 非ログインユーザー用編集ページのレンダリング結果
 */
export default function GuestEditPage() {
  return <EditFeature />;
}