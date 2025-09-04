/**
 * TriFoldPrintPreview コンポーネント
 * 
 * 三つ折り印刷プレビューダイアログです。
 * printJSを使わずにブラウザの標準印刷機能を使用します。
 * 
 * @fileoverview 印刷プレビューを表示し、ブラウザの標準印刷機能で
 * 三つ折り印刷用のレイアウトを印刷できます。
 */

import React, { useRef } from "react";
import type { Itinerary } from "@/types";
import { Button } from "./Primitives";
import TriFoldItinerary from "./TriFoldItinerary";
import styles from "./TriFoldPrintPreview.module.css";

/**
 * TriFoldPrintPreviewコンポーネントのプロパティ型定義
 */
export interface TriFoldPrintPreviewProps {
  /** 印刷する旅のしおりデータ */
  data: Itinerary;
  /** ダイアログの表示状態 */
  isOpen: boolean;
  /** ダイアログを閉じるコールバック関数 */
  onClose: () => void;
}

/**
 * 三つ折り印刷プレビューダイアログコンポーネント
 * 
 * 旅のしおりデータを三つ折り印刷用のレイアウトでプレビュー表示し、
 * ブラウザの標準印刷機能で印刷できるダイアログです。
 * 
 * @param props.data - 印刷する旅のしおりデータ
 * @param props.isOpen - ダイアログの表示状態
 * @param props.onClose - ダイアログを閉じるコールバック関数
 * @returns 三つ折り印刷プレビューダイアログコンポーネント
 * @example
 * <TriFoldPrintPreview 
 *   data={itineraryData} 
 *   isOpen={showPreview} 
 *   onClose={() => setShowPreview(false)} 
 * />
 */
export default function TriFoldPrintPreview({ 
  data, 
  isOpen, 
  onClose 
}: TriFoldPrintPreviewProps): React.JSX.Element | null {
  const printAreaRef = useRef<HTMLDivElement>(null);

  /**
   * 印刷を実行する関数
   * 
   * ブラウザの標準印刷機能を呼び出します。
   * 印刷時は印刷専用エリアのみが印刷されます。
   */
  const handlePrint = (): void => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* プレビューダイアログ */}
      <div className={styles.overlay}>
        <div className={styles.dialog}>
          {/* ヘッダー */}
          <div className={styles.header}>
            <h2 className={styles.title}>三つ折り印刷プレビュー</h2>
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="閉じる"
            >
              <i className="mdi mdi-close" aria-hidden />
            </button>
          </div>

          {/* プレビューエリア */}
          <div className={styles.previewArea}>
            <TriFoldItinerary data={data} />
          </div>

          {/* アクションボタン */}
          <div className={styles.actions}>
            <Button kind="ghost" type="button" onClick={onClose}>
              キャンセル
            </Button>
            <Button type="button" onClick={handlePrint}>
              <i className="mdi mdi-printer mr-2" aria-hidden />
              印刷
            </Button>
          </div>
        </div>
      </div>

      {/* 印刷専用エリア（画面には表示しない） */}
      <div className={styles.printArea} ref={printAreaRef}>
        <TriFoldItinerary data={data} />
      </div>
    </>
  );
}
