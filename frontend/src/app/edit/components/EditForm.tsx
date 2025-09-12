import React from "react";

/**
 * 編集対象のドキュメント型定義
 */
export type Doc = {
  /** ドキュメントの一意識別子 */
  id: string;
  /** ドキュメントのタイトル（オプション） */
  title?: string;
  /** ドキュメントの本文（オプション） */
  body?: string;
};

/**
 * EditFormコンポーネントのプロパティ型定義
 */
export interface EditFormProps {
  /** 編集対象のドキュメントデータ（nullの場合はデフォルト値を使用） */
  initialData: Doc | null;
}

/**
 * ドキュメント編集フォームコンポーネント
 * 
 * ドキュメントの基本情報を表示・編集するためのシンプルなフォームです。
 * 現在はIDの表示のみを提供しています。
 * 
 * @param props.initialData - 編集対象のドキュメントデータ（nullの場合はデフォルト値を使用）
 * @returns ドキュメント編集フォームのレンダリング結果
 * @example
 * <EditForm initialData={{ id: "doc-1", title: "サンプル", body: "内容" }} />
 */
export default function EditForm({ initialData }: EditFormProps): React.JSX.Element {
  const id = initialData?.id ?? "default";

  return (
    <div className="space-y-1">
      <div className="text-sm text-muted">ID</div>
      <div className="font-mono text-lg text-body">{id}</div>
    </div>
  );
}
