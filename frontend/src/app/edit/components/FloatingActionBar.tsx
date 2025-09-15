"use client";

import React from "react";
import { ActionIconButton } from "@/components/Primitives";

/**
 * フローティングアクションバー（FCAB）
 * 
 * 画面下部に固定表示されるクイックアクションボタン群を提供します。
 * ゲストモードではAI機能と共有機能は無効化されます。
 * 
 * @param props.onBackToList - 旅程一覧に戻るハンドラー
 * @param props.onUndo - Undoハンドラー
 * @param props.onRedo - Redoハンドラー
 * @param props.onSave - 保存ハンドラー
 * @param props.onPrintPreview - 印刷プレビューハンドラー
 * @param props.onShare - 共有ハンドラー
 * @param props.onAiDialog - AI対話ダイアログハンドラー
 * @param props.canUndo - Undo可能フラグ
 * @param props.canRedo - Redo可能フラグ
 * @param props.saving - 保存中フラグ
 * @param props.itineraryId - 旅程ID（保存機能の表示制御用）
 * @param props.isGuestMode - ゲストモード（非ログイン）かどうか
 * @returns レンダリングされたFloatingActionBarコンポーネント
 */
interface FloatingActionBarProps {
  onBackToList: () => void;
  onUndo: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  onRedo: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  onSave: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  onPrintPreview: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  onShare: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  onAiDialog: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  canUndo: boolean;
  canRedo: boolean;
  saving: boolean;
  itineraryId?: string;
  isGuestMode?: boolean;
}

export default function FloatingActionBar({
  onBackToList,
  onUndo,
  onRedo,
  onSave,
  onPrintPreview,
  onShare,
  onAiDialog,
  canUndo,
  canRedo,
  saving,
  itineraryId,
  isGuestMode = false
}: FloatingActionBarProps) {
  return (
    <div className="fcab" role="toolbar" aria-label="クイックアクション">
      <ActionIconButton 
        icon="mdi-arrow-left" 
        kind="ghost"
        elevation={2}
        dataTip="旅程一覧に戻る" 
        onClick={onBackToList}
      />
      <ActionIconButton 
        icon="mdi-undo" 
        kind="ghost"
        elevation={2}
        dataTip="Undo（直前の変更を取り消す） Ctrl+Z" 
        onClick={onUndo} 
        disabled={!canUndo} 
      />
      <ActionIconButton 
        icon="mdi-redo" 
        kind="ghost"
        elevation={2}
        dataTip="Redo（取り消しをやり直す） Ctrl+Y" 
        onClick={onRedo} 
        disabled={!canRedo} 
      />
      {/* 自動保存機能により手動保存ボタンは不要
      {itineraryId && (
        <ActionIconButton 
          icon="mdi-content-save" 
          kind="ghost"
          elevation={2}
          dataTip="旅程を保存" 
          onClick={onSave}
          disabled={saving}
        />
      )}
      */}
      <ActionIconButton 
        icon="mdi-printer" 
        kind="ghost"
        elevation={2}
        dataTip="印刷プレビューを開く Ctrl+Alt+P" 
        onClick={onPrintPreview} 
      />
      <ActionIconButton
        icon="mdi-link-variant"
        kind="ghost"
        elevation={2}
        dataTip={isGuestMode ? "共有機能はログイン後にご利用いただけます" : "共有URLを生成 Ctrl+Alt+S"}
        onClick={onShare}
        disabled={isGuestMode}
        className={isGuestMode ? "opacity-50 cursor-not-allowed" : ""}
      />
      <ActionIconButton 
        icon="mdi-robot" 
        kind="ghost"
        elevation={2}
        dataTip={isGuestMode ? "AI機能はログイン後にご利用いただけます" : "AI対話形式で編集 Ctrl+Alt+L"}
        onClick={onAiDialog}
        disabled={isGuestMode}
        className={isGuestMode ? "opacity-50 cursor-not-allowed" : ""}
      />
    </div>
  );
}
