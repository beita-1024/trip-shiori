"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/Primitives";
import useItineraryStore, { normalizeItineraryTimes } from "@/components/itineraryStore";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import TriFoldPrintPreview from "@/components/TriFoldPrintPreview";
import DemoLabel from "@/components/DemoLabel";
import AuthRequiredDialog from "@/components/AuthRequiredDialog";
import { useTutorial } from "@/hooks/useTutorial";
import { stripUids, parseWithUids } from "@/components/uiUid";
import type { ItineraryWithUid } from "@/types";

// 分割されたコンポーネントをインポート
import ItineraryHeader from "./components/ItineraryHeader";
import DayEditor from "./components/DayEditor";
import ActionPanel from "./components/ActionPanel";
import FloatingActionBar from "./components/FloatingActionBar";
import Dialogs from "./components/Dialogs";

/**
 * 旅程編集機能のメインコンポーネント（リファクタリング版）
 * 
 * ユーザーが旅程を編集できる包括的なインターフェースを提供します。
 * セクションごとに分割されたコンポーネントを使用して、可読性とメンテナンス性を向上させています。
 * 
 * 主な機能：
 * - 旅程の基本情報編集（タイトル、サブタイトル、概要）
 * - 日別イベントの管理（追加、削除、並べ替え）
 * - AI補完機能（ログイン時のみ）
 * - 印刷プレビュー
 * - 共有URL生成（ログイン時のみ）
 * - Undo/Redo機能
 * 
 * @param props.itineraryId - 旅程ID（オプション）
 * @param props.isGuestMode - ゲストモード（非ログイン）かどうか
 * @returns レンダリングされたEditFeatureコンポーネント
 */
interface EditFeatureProps {
  itineraryId?: string;
  isGuestMode?: boolean;
}

export default function EditFeatureRefactored({ itineraryId, isGuestMode = false }: EditFeatureProps = {}) {
  const router = useRouter();
  
  console.log('EditFeature: isGuestMode =', isGuestMode, 'itineraryId =', itineraryId);
  
  // ゲストモードの場合は認証チェックをスキップ（redirectToLogin = false）
  const { isAuthenticated, isLoading: authLoading } = useAuthRedirect(!isGuestMode);
  
  // チュートリアル機能
  const { startTutorial, isFirstTime, isLoading: tutorialLoading } = useTutorial();
  
  // useItineraryStore によって LocalStorage からのロードと自動保存が行われます
  // itineraryIdが提供されている場合、WebAPI自動保存も有効になります
  const [
    itinerary,
    setItinerary,
    aiCompleteEvent,
    aiEditItinerary,
    resetItinerary,
    shareItinerary,
    , // loadSharedItinerary (未使用)
    saveItinerary,
    undo,
    redo,
    canUndo,
    canRedo,
    hasUnsavedChanges
  ] = useItineraryStore(itineraryId);

  // 状態管理
  const [sharedUrl, setSharedUrl] = React.useState<string>("");
  const [showPrintPreview, setShowPrintPreview] = React.useState(false);
  const [showTriFoldPrintPreview, setShowTriFoldPrintPreview] = React.useState(false);
  const [showShareDialog, setShowShareDialog] = React.useState(false);
  const [shareLoading, setShareLoading] = React.useState(false);
  const [shareError, setShareError] = React.useState<string>("");
  const [showAiDialog, setShowAiDialog] = React.useState(false);
  const [aiInput, setAiInput] = React.useState("");
  const [aiLoading, setAiLoading] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string>("");
  const [showToast, setShowToast] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [showExitDialog, setShowExitDialog] = React.useState(false);
  
  // 認証必須ダイアログの状態
  const [showAuthDialog, setShowAuthDialog] = React.useState(false);
  const [authRequiredFeature, setAuthRequiredFeature] = React.useState<string>("");

  // JSONダイアログの状態
  const [showJsonDialog, setShowJsonDialog] = React.useState(false);
  const [jsonText, setJsonText] = React.useState("");
  const [jsonError, setJsonError] = React.useState<string>("");

  // AI補完ボタンのローディング状態を管理（イベント単位）
  const [loadingKeys, setLoadingKeys] = React.useState<Set<string>>(new Set());

  // 離脱ガード（未保存の変更がある場合に確認）

  // AI対話ダイアログのテキストエリアの参照
  const aiTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  /**
   * 初回アクセス時にチュートリアルを自動開始（/editページのみ）
   */
  useEffect(() => {
    if (isGuestMode && isFirstTime && !tutorialLoading && !authLoading) {
      // 少し遅延させてDOMの準備を待つ
      const timer = setTimeout(() => {
        startTutorial();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isGuestMode, isFirstTime, tutorialLoading, authLoading, startTutorial]);

  /**
   * トースト通知を表示する関数
   */
  const showToastMessage = useCallback((message: string, duration: number = 3000) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, duration);
  }, []);

  /**
   * 認証が必要な機能を呼び出そうとした際のハンドラー
   */
  const handleAuthRequired = useCallback((featureName: string) => {
    if (isGuestMode && !isAuthenticated) {
      setAuthRequiredFeature(featureName);
      setShowAuthDialog(true);
      return true; // 認証が必要
    }
    return false; // 認証済み
  }, [isGuestMode, isAuthenticated]);

  /**
   * 登録ページへの遷移
   */
  const handleRegister = useCallback(() => {
    router.push('/register');
  }, [router]);

  /**
   * 共有リンク生成の処理
   */
  const handleShareItinerary = useCallback(async () => {
    // 認証チェック
    if (handleAuthRequired("共有機能")) {
      return;
    }

    setShareError("");
    setShowShareDialog(true);
    setShareLoading(true);
    try {
      const url = await shareItinerary();
      if (url) {
        setSharedUrl(url);
      } else {
        setShareError("共有URLの生成に失敗しました。");
      }
    } catch (e) {
      console.error(e);
      setShareError("共有URLの生成に失敗しました。");
    } finally {
      setShareLoading(false);
    }
  }, [shareItinerary, handleAuthRequired]);

  /**
   * AI対話送信の処理
   */
  const handleAiEditSubmit = useCallback(async () => {
    // 認証チェック
    if (handleAuthRequired("AI編集機能")) {
      return;
    }

    if (!aiInput.trim()) {
      showToastMessage("編集内容を入力してください", 2000);
      return;
    }
    
    setAiLoading(true);
    try {
      const result = await aiEditItinerary(aiInput.trim());
      if (result.success) {
        setAiInput("");
        setShowAiDialog(false);
        if (result.changeDescription) {
          showToastMessage(`✅ ${result.changeDescription}`, 15000);
        } else {
          showToastMessage("✅ 旅程を編集しました", 9000);
        }
      } else {
        showToastMessage(`❌ ${result.error || "旅程編集に失敗しました"}`, 15000);
      }
    } catch (error) {
      console.error("AI旅程編集エラー:", error);
      showToastMessage("❌ 旅程編集中にエラーが発生しました", 15000);
    } finally {
      setAiLoading(false);
    }
  }, [aiInput, aiEditItinerary, showToastMessage, handleAuthRequired]);

  /**
   * JSONエクスポートの処理
   */
  const handleExportJson = useCallback(() => {
    try {
      // _uidを除去してクリーンなItinerary型に変換
      const cleanItinerary = stripUids(itinerary);
      // 整形済みJSON文字列を生成
      const jsonString = JSON.stringify(cleanItinerary, null, 2);
      setJsonText(jsonString);
      setJsonError("");
      setShowJsonDialog(true);
    } catch (error) {
      console.error("JSONエクスポートエラー:", error);
      const errorMessage = "JSONのエクスポートに失敗しました";
      setJsonError(errorMessage);
      setShowJsonDialog(true);
      showToastMessage(`❌ ${errorMessage}`, 5000);
    }
  }, [itinerary, showToastMessage]);

  /**
   * JSONインポートの処理
   */
  const handleImportJson = useCallback(() => {
    try {
      if (!jsonText.trim()) {
        setJsonError("JSONデータを入力してください");
        return;
      }

      // JSONパース
      const parsed = JSON.parse(jsonText);
      
      // 基本的な構造チェック
      if (!parsed || typeof parsed !== 'object') {
        throw new Error("無効なJSON形式です");
      }
      
      if (!parsed.days || !Array.isArray(parsed.days)) {
        throw new Error("daysフィールドが必要です");
      }

      // parseWithUidsでパース（_uidは自動生成）
      const loaded = parseWithUids(parsed);
      
      // 時間値を正規化
      const normalized = normalizeItineraryTimes(loaded);
      
      // 状態を更新
      setItinerary(normalized as ItineraryWithUid);
      setJsonError("");
      setShowJsonDialog(false);
      setJsonText("");
      showToastMessage("✅ JSONから旅程を読み込みました", 3000);
    } catch (error) {
      console.error("JSONインポートエラー:", error);
      const errorMessage = error instanceof Error ? error.message : "不明なエラー";
      setJsonError(`JSONの読み込みに失敗しました: ${errorMessage}`);
      showToastMessage(`❌ JSONの読み込みに失敗しました: ${errorMessage}`, 5000);
    }
  }, [jsonText, setItinerary, showToastMessage]);

  /**
   * キーボードショートカットの処理
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Esc: ダイアログを閉じる
      if (event.key === 'Escape') {
        if (showTriFoldPrintPreview) {
          event.preventDefault();
          setShowTriFoldPrintPreview(false);
        } else if (showShareDialog) {
          event.preventDefault();
          setShowShareDialog(false);
        } else if (showAiDialog) {
          event.preventDefault();
          setShowAiDialog(false);
        } else if (showJsonDialog) {
          event.preventDefault();
          setShowJsonDialog(false);
        }
        return;
      }
      
      // Ctrl+Shift+J: JSONエクスポート/インポートダイアログを開く
      if (event.ctrlKey && event.shiftKey && event.key === 'J') {
        event.preventDefault();
        handleExportJson();
      }
      
      // Ctrl+Z: Undo
      if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (canUndo) {
          undo();
        }
      }
      
      // Ctrl+Y: Redo
      if (event.ctrlKey && event.key === 'y') {
        event.preventDefault();
        if (canRedo) {
          redo();
        }
      }
      
      // Ctrl+Alt+P: 印刷プレビュー
      if (event.ctrlKey && event.altKey && event.key === 'p') {
        event.preventDefault();
        setShowTriFoldPrintPreview(true);
      }
      
      // Ctrl+Alt+S: 共有リンク生成
      if (event.ctrlKey && event.altKey && event.key === 's') {
        event.preventDefault();
        handleShareItinerary();
      }
      
      // Ctrl+Alt+L: AI対話形式で編集
      if (event.ctrlKey && event.altKey && event.key === 'l') {
        event.preventDefault();
        setShowAiDialog(true);
        // 次のフレームでテキストエリアにフォーカス
        setTimeout(() => {
          aiTextareaRef.current?.focus();
        }, 100);
      }
      
      // Ctrl+Enter: AI対話送信（ダイアログが開いている場合のみ）
      if (event.ctrlKey && event.key === 'Enter' && showAiDialog) {
        event.preventDefault();
        handleAiEditSubmit();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [canUndo, canRedo, showAiDialog, showTriFoldPrintPreview, showShareDialog, showJsonDialog, handleAiEditSubmit, handleShareItinerary, handleExportJson, redo, undo]);


  /**
   * 旅程を保存する関数
   */
  const handleSaveItinerary = useCallback(async () => {
    if (!itineraryId) {
      showToastMessage("保存先のIDが指定されていません", 3000);
      return;
    }

    setSaving(true);
    try {
      const success = await saveItinerary(itineraryId);
      if (success) {
        showToastMessage("✅ 旅程を保存しました", 3000);
        return true;
      } else {
        showToastMessage("❌ 保存に失敗しました", 5000);
        return false;
      }
    } catch (error) {
      console.error("保存エラー:", error);
      showToastMessage("❌ 保存中にエラーが発生しました", 5000);
      return false;
    } finally {
      setSaving(false);
    }
  }, [itineraryId, saveItinerary, showToastMessage]);

  /**
   * 旅程一覧に戻る関数
   */
  const handleBackToList = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      router.push('/itineraries');
    }
  }, [hasUnsavedChanges, router]);

  /**
   * 保存して戻る関数
   */
  const handleSaveAndExit = useCallback(async () => {
    if (!itineraryId) {
      showToastMessage("保存先のIDが指定されていません", 3000);
      return;
    }

    const success = await handleSaveItinerary();
    if (success) {
      setShowExitDialog(false);
      router.push('/itineraries');
    }
  }, [itineraryId, handleSaveItinerary, showToastMessage, router]);

  /**
   * 破棄して戻る関数
   */
  const handleDiscardAndExit = useCallback(() => {
    setShowExitDialog(false);
    router.push('/itineraries');
  }, [router]);

  /**
   * ページ離脱時の確認ダイアログを設定
   */
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    
    const confirmMessage = "旅程に未保存の変更があります。保存してから戻るか、変更を破棄して戻るかを選択してください。";

    // ブラウザのリロード/タブ閉じなど
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // リンククリックでのページ遷移を捕捉してカスタム確認
    const handleDocumentClick = (ev: MouseEvent) => {
      if (!hasUnsavedChanges) return;
      if (ev.defaultPrevented || ev.button !== 0) return;
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      
      if (anchor.target && anchor.target !== "") return;
      
      const href = anchor.href;
      if (!href) return;
      
      const sameBase = href.split("#")[0] === window.location.href.split("#")[0];
      if (sameBase && href.includes("#")) return;
      
      const ok = window.confirm(confirmMessage);
      if (!ok) {
        ev.preventDefault();
        ev.stopPropagation();
      }
    };
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [hasUnsavedChanges]);

  // 認証チェック中（ゲストモードでない場合のみ）
  if (!isGuestMode && (authLoading || isAuthenticated === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-muted">認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  // 認証されていない場合は自動的にログイン画面にリダイレクトされる（ゲストモードでない場合のみ）
  if (!isGuestMode && isAuthenticated === false) {
    return null;
  }

  return (
    <main>
      <div className="no-print">
        {/* 戻るボタン（/edit/:idページのみ表示） */}
        {itineraryId && (
          <div className="max-w-2xl mx-auto mb-4">
            <Button
              kind="ghost"
              type="button"
              onClick={handleBackToList}
              className="flex items-center gap-2"
            >
              <i className="mdi mdi-arrow-left" aria-hidden />
              旅程一覧に戻る
            </Button>
          </div>
        )}

        {/* 基本情報編集セクション */}
        <ItineraryHeader 
          itinerary={itinerary}
          onItineraryChange={setItinerary}
        />

        {/* 日別編集セクション */}
        <DayEditor
          itinerary={itinerary}
          onItineraryChange={setItinerary}
          onAiCompleteEvent={aiCompleteEvent}
          loadingKeys={loadingKeys}
          setLoadingKeys={setLoadingKeys}
          isGuestMode={isGuestMode}
          onAuthRequired={handleAuthRequired}
        />

        {/* 操作パネル */}
        <ActionPanel onResetItinerary={resetItinerary} />
        
        {/* 下部余白 - FCABとAI編集ダイアログのためのスペース */}
        <div className="h-108"></div>
      </div>

      {/* FCAB: Floating Center Actions Bar */}
      <FloatingActionBar
        onBackToList={itineraryId ? handleBackToList : undefined}
        onUndo={() => undo()}
        onRedo={() => redo()}
        onSave={() => handleSaveItinerary()}
        onPrintPreview={() => setShowTriFoldPrintPreview(true)}
        onShare={handleShareItinerary}
        onAiDialog={() => {
          setShowAiDialog((v) => !v);
          if (!showAiDialog) {
            setTimeout(() => {
              aiTextareaRef.current?.focus();
            }, 100);
          }
        }}
        canUndo={canUndo}
        canRedo={canRedo}
        saving={saving}
        itineraryId={itineraryId}
        isGuestMode={isGuestMode}
      />

      {/* ダイアログ群 */}
      <Dialogs
        itinerary={itinerary}
        showPrintPreview={showPrintPreview}
        showTriFoldPrintPreview={showTriFoldPrintPreview}
        showShareDialog={showShareDialog}
        showAiDialog={showAiDialog}
        showExitDialog={showExitDialog}
        showToast={showToast}
        sharedUrl={sharedUrl}
        shareLoading={shareLoading}
        shareError={shareError}
        aiInput={aiInput}
        aiLoading={aiLoading}
        toastMessage={toastMessage}
        saving={saving}
        itineraryId={itineraryId}
        showJsonDialog={showJsonDialog}
        jsonText={jsonText}
        jsonError={jsonError}
        onClosePrintPreview={() => setShowPrintPreview(false)}
        onCloseTriFoldPrintPreview={() => setShowTriFoldPrintPreview(false)}
        onCloseShareDialog={() => setShowShareDialog(false)}
        onCloseAiDialog={() => setShowAiDialog(false)}
        onCloseExitDialog={() => setShowExitDialog(false)}
        onCloseJsonDialog={() => {
          setShowJsonDialog(false);
          setJsonError("");
        }}
        onCopySharedUrl={async () => {
          try { 
            await navigator.clipboard.writeText(sharedUrl || ""); 
          } catch (e) { 
            console.error("clipboard copy failed", e); 
          }
        }}
        onAiInputChange={setAiInput}
        onAiEditSubmit={handleAiEditSubmit}
        onSaveAndExit={handleSaveAndExit}
        onDiscardAndExit={handleDiscardAndExit}
        onJsonTextChange={setJsonText}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        aiTextareaRef={aiTextareaRef}
      />

      {/* 三つ折り印刷プレビューダイアログ */}
      <TriFoldPrintPreview
        data={itinerary}
        isOpen={showTriFoldPrintPreview}
        onClose={() => setShowTriFoldPrintPreview(false)}
      />

      {/* デモ版ラベル（ゲストモード時のみ表示） */}
      {isGuestMode && (
        <DemoLabel onRegisterClick={handleRegister} />
      )}

      {/* 認証必須ダイアログ */}
      <AuthRequiredDialog
        isOpen={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
        onRegister={handleRegister}
        featureName={authRequiredFeature}
      />
    </main>
  );
}
