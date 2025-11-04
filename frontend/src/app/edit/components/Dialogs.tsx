"use client";

import React from "react";
import { Button, Spinner } from "@/components/Primitives";
import type { ItineraryWithUid, DayWithUid, EventWithUid } from "@/types";

/**
 * 時刻形式を正規化する関数
 * 
 * 印刷プレビュー用に時刻を統一された形式に変換します。
 * ISO形式（2023-10-01T10:00:00）やHH:MM形式を処理します。
 * 
 * @param timeStr - 正規化する時刻文字列
 * @returns 正規化された時刻文字列（HH:MM形式）、無効な場合は空文字
 * @example
 * normalizeTimeForDisplay("2023-10-01T10:30:00") // "10:30"
 * normalizeTimeForDisplay("14:45") // "14:45"
 */
function normalizeTimeForDisplay(timeStr: string): string {
  if (!timeStr) return "";
  
  // ISO形式（2023-10-01T10:00:00）をHH:MMに変換
  const isoMatch = timeStr.match(/^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2}):\d{2}/);
  if (isoMatch) {
    return `${isoMatch[1]}:${isoMatch[2]}`;
  }
  
  // 既にHH:MM形式の場合はそのまま返す
  const hhmmMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmmMatch) {
    return timeStr;
  }
  
  // その他の形式は空文字を返す
  return "";
}

/**
 * ダイアログ群コンポーネント
 * 
 * 共有、AI対話、保存確認、印刷プレビューなどのダイアログを管理します。
 * 
 * @param props.itinerary - 旅程データ
 * @param props.showPrintPreview - 印刷プレビュー表示フラグ
 * @param props.showTriFoldPrintPreview - 三つ折り印刷プレビュー表示フラグ
 * @param props.showShareDialog - 共有ダイアログ表示フラグ
 * @param props.showAiDialog - AI対話ダイアログ表示フラグ
 * @param props.showExitDialog - 保存確認ダイアログ表示フラグ
 * @param props.showToast - トースト表示フラグ
 * @param props.sharedUrl - 共有URL
 * @param props.shareLoading - 共有処理中フラグ
 * @param props.shareError - 共有エラーメッセージ
 * @param props.aiInput - AI入力テキスト
 * @param props.aiLoading - AI処理中フラグ
 * @param props.toastMessage - トーストメッセージ
 * @param props.saving - 保存中フラグ
 * @param props.itineraryId - 旅程ID
 * @param props.showJsonDialog - JSONダイアログ表示フラグ
 * @param props.jsonText - JSONテキスト
 * @param props.jsonError - JSONエラーメッセージ
 * @param props.onClosePrintPreview - 印刷プレビュー閉じるハンドラー
 * @param props.onCloseTriFoldPrintPreview - 三つ折り印刷プレビュー閉じるハンドラー
 * @param props.onCloseShareDialog - 共有ダイアログ閉じるハンドラー
 * @param props.onCloseAiDialog - AI対話ダイアログ閉じるハンドラー
 * @param props.onCloseExitDialog - 保存確認ダイアログ閉じるハンドラー
 * @param props.onCloseJsonDialog - JSONダイアログ閉じるハンドラー
 * @param props.onCopySharedUrl - 共有URLコピーハンドラー
 * @param props.onAiInputChange - AI入力変更ハンドラー
 * @param props.onAiEditSubmit - AI編集送信ハンドラー
 * @param props.onSaveAndExit - 保存して戻るハンドラー
 * @param props.onDiscardAndExit - 破棄して戻るハンドラー
 * @param props.onJsonTextChange - JSONテキスト変更ハンドラー
 * @param props.onExportJson - JSONエクスポートハンドラー
 * @param props.onImportJson - JSONインポートハンドラー
 * @param props.aiTextareaRef - AIテキストエリアの参照
 * @returns レンダリングされたDialogsコンポーネント
 */
interface DialogsProps {
  itinerary: ItineraryWithUid;
  showPrintPreview: boolean;
  showTriFoldPrintPreview: boolean;
  showShareDialog: boolean;
  showAiDialog: boolean;
  showExitDialog: boolean;
  showToast: boolean;
  sharedUrl: string;
  shareLoading: boolean;
  shareError: string;
  aiInput: string;
  aiLoading: boolean;
  toastMessage: string;
  saving: boolean;
  itineraryId?: string;
  showJsonDialog: boolean;
  jsonText: string;
  jsonError: string;
  onClosePrintPreview: () => void;
  onCloseTriFoldPrintPreview: () => void;
  onCloseShareDialog: () => void;
  onCloseAiDialog: () => void;
  onCloseExitDialog: () => void;
  onCloseJsonDialog: () => void;
  onCopySharedUrl: () => void;
  onAiInputChange: (value: string) => void;
  onAiEditSubmit: () => void;
  onSaveAndExit: () => void;
  onDiscardAndExit: () => void;
  onJsonTextChange: (value: string) => void;
  onExportJson: () => void;
  onImportJson: () => void;
  aiTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export default function Dialogs({
  itinerary,
  showPrintPreview,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  showTriFoldPrintPreview,
  showShareDialog,
  showAiDialog,
  showExitDialog,
  showToast,
  sharedUrl,
  shareLoading,
  shareError,
  aiInput,
  aiLoading,
  toastMessage,
  saving,
  itineraryId,
  showJsonDialog,
  jsonText,
  jsonError,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onClosePrintPreview,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onCloseTriFoldPrintPreview,
  onCloseShareDialog,
  onCloseAiDialog,
  onCloseExitDialog,
  onCloseJsonDialog,
  onCopySharedUrl,
  onAiInputChange,
  onAiEditSubmit,
  onSaveAndExit,
  onDiscardAndExit,
  onJsonTextChange,
  onExportJson,
  onImportJson,
  aiTextareaRef
}: DialogsProps) {
  return (
    <>
      {/* 印刷専用（画面には表示しない）。ダイアログを開いている間だけ出力対象 */}
      {showPrintPreview && (
        <div className="print-area">
          <div className="print-doc">
            <div className="print-header mb-4">
              <div className="print-title">{itinerary.title || "(無題)"}</div>
              {itinerary.subtitle && (<div className="print-subtitle">{itinerary.subtitle}</div>)}
              {itinerary.description && (<div className="print-overview">{itinerary.description}</div>)}
            </div>

            <div className="print-days">
              {itinerary.days.map((day: DayWithUid, dIdx: number) => (
                <section key={day._uid || dIdx} className="print-day">
                  <div className="print-day-title">
                    {(() => {
                      if (!day.date) return `Day ${dIdx + 1}`;
                      const dateObj = new Date(day.date as string | Date);
                      const dateStr = dateObj.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
                      const wk = new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(dateObj);
                      return `${dateStr} (${wk})`;
                    })()}
                  </div>
                  <table className="print-events">
                    <thead>
                      <tr>
                        <th className="print-th">時間</th>
                        <th className="print-th">タイトル</th>
                        <th className="print-th">内容</th>
                      </tr>
                    </thead>
                    <tbody>
                      {day.events.map((ev: EventWithUid, eIdx: number) => (
                        <tr key={ev._uid || eIdx}>
                          <td className="print-td">
                            {normalizeTimeForDisplay(ev.time || "")} 
                            {(ev.end_time ? ` - ${normalizeTimeForDisplay(ev.end_time)}` : "")}
                          </td>
                          <td className="print-td">{ev.title}</td>
                          <td className="print-td">{ev.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 共有URLダイアログ */}
      {showShareDialog && (
        <div className="no-print fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface border border-ui rounded-lg p-4 w-[min(640px,90vw)] elevation-4 relative">
            <button
              type="button"
              className="action-icon-btn absolute right-3 top-3 z-10"
              aria-label="閉じる"
              onClick={onCloseShareDialog}
            >
              <i className="mdi mdi-close" aria-hidden />
            </button>
            <div className="text-lg font-medium mb-2">共有リンク</div>
            {shareLoading ? (
              <div className="flex items-center text-muted"><Spinner size="sm" className="mr-2" /> 生成中…</div>
            ) : shareError ? (
              <div className="text-red-600">{shareError}</div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <input readOnly value={sharedUrl} className="flex-1 rounded-md border border-input p-3 bg-input text-body" />
                  <Button kind="ghost" type="button" onClick={onCopySharedUrl}>
                    <i className="mdi mdi-content-copy mr-1" aria-hidden /> コピー
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI対話ダイアログ */}
      {showAiDialog && (
        <div className="no-print fixed left-1/2 -translate-x-1/2 bottom-[96px] z-50">
          <div className="bg-surface border border-ui rounded-lg p-4 w-[min(640px,90vw)] elevation-4 relative">
            <button
              type="button"
              className="action-icon-btn absolute right-3 top-3 z-10"
              aria-label="閉じる"
              onClick={onCloseAiDialog}
            >
              <i className="mdi mdi-close" aria-hidden />
            </button>
            <div className="text-lg font-medium mb-3 pr-8">AI対話形式で編集</div>
            <textarea
              ref={aiTextareaRef}
              rows={4}
              className="w-full rounded-md border border-input p-3 bg-input text-body mb-3 placeholder:text-input-placeholder"
              placeholder="例）2日目の午後に名古屋城の観光を追加して"
              value={aiInput}
              onChange={(e) => onAiInputChange(e.target.value)}
              disabled={aiLoading}
            />
            <div className="flex items-center justify-end gap-2">
              <Button 
                kind="ghost" 
                type="button" 
                onClick={onAiEditSubmit}
                disabled={aiLoading || !aiInput.trim()}
              >
                {aiLoading ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    処理中...
                  </>
                ) : (
                  <>
                    <i className="mdi mdi-send mr-2" aria-hidden /> 
                    送信 (Ctrl+Enter)
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 保存確認ダイアログ */}
      {showExitDialog && (
        <div className="no-print fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface border border-ui rounded-lg p-6 w-[min(480px,90vw)] elevation-4">
            <div className="text-lg font-medium mb-4">保存されていない変更があります</div>
            <p className="text-muted mb-6">
              旅程に未保存の変更があります。保存してから戻るか、変更を破棄して戻るかを選択してください。
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                kind="ghost"
                type="button"
                onClick={onCloseExitDialog}
              >
                キャンセル
              </Button>
              <Button
                kind="destructive"
                type="button"
                onClick={onDiscardAndExit}
              >
                破棄して戻る
              </Button>
              {itineraryId && (
                <Button
                  kind="primary"
                  type="button"
                  onClick={onSaveAndExit}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      保存中...
                    </>
                  ) : (
                    "保存して戻る"
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* JSONエクスポート/インポートダイアログ */}
      {showJsonDialog && (
        <div className="no-print fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface border border-ui rounded-lg p-4 w-[min(800px,90vw)] max-h-[90vh] elevation-4 relative flex flex-col">
            <button
              type="button"
              className="action-icon-btn absolute right-3 top-3 z-10"
              aria-label="閉じる"
              onClick={onCloseJsonDialog}
            >
              <i className="mdi mdi-close" aria-hidden />
            </button>
            <div className="text-lg font-medium mb-4 pr-8">JSONエクスポート/インポート</div>
            
            {/* エクスポートセクション（jsonTextが存在し、エラーがない場合） */}
            {jsonText && !jsonError ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="text-sm text-muted mb-2">現在の旅程データ（整形済みJSON）</div>
                <textarea
                  readOnly
                  value={jsonText}
                  className="flex-1 rounded-md border border-input p-3 bg-input text-body font-mono text-sm resize-none min-h-[400px]"
                  style={{ fontFamily: 'monospace' }}
                />
                <div className="flex items-center justify-end gap-2 mt-3">
                  <Button 
                    kind="ghost" 
                    type="button" 
                    onClick={() => {
                      onJsonTextChange("");
                      onExportJson();
                    }}
                  >
                    <i className="mdi mdi-refresh mr-1" aria-hidden /> 再エクスポート
                  </Button>
                  <Button 
                    kind="ghost" 
                    type="button" 
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(jsonText);
                        // コピー成功のフィードバック（簡易版）
                      } catch (e) {
                        console.error("clipboard copy failed", e);
                      }
                    }}
                  >
                    <i className="mdi mdi-content-copy mr-1" aria-hidden /> コピー
                  </Button>
                </div>
              </div>
            ) : (
              /* インポートセクション */
              <div className="flex-1 flex flex-col min-h-0">
                <div className="text-sm text-muted mb-2">JSONデータを貼り付けてください</div>
                <textarea
                  value={jsonText}
                  onChange={(e) => onJsonTextChange(e.target.value)}
                  className="flex-1 rounded-md border border-input p-3 bg-input text-body font-mono text-sm resize-none min-h-[400px] placeholder:text-input-placeholder"
                  style={{ fontFamily: 'monospace' }}
                  placeholder='{"title": "旅程タイトル", "days": [...]}'
                />
                {jsonError && (
                  <div className="text-red-600 text-sm mt-2">{jsonError}</div>
                )}
                <div className="flex items-center justify-end gap-2 mt-3">
                  <Button
                    kind="ghost"
                    type="button"
                    onClick={onExportJson}
                  >
                    <i className="mdi mdi-export mr-1" aria-hidden /> エクスポート
                  </Button>
                  <Button
                    kind="ghost"
                    type="button"
                    onClick={onCloseJsonDialog}
                  >
                    キャンセル
                  </Button>
                  <Button
                    kind="primary"
                    type="button"
                    onClick={onImportJson}
                    disabled={!jsonText.trim()}
                  >
                    <i className="mdi mdi-import mr-2" aria-hidden /> インポート
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* トースト通知 */}
      {showToast && (
        <div className="no-print fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-surface border border-ui rounded-lg p-3 shadow-lg elevation-4 max-w-md">
            <div className="text-body text-sm">{toastMessage}</div>
          </div>
        </div>
      )}
    </>
  );
}
