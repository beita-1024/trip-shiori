/**
 * PrintArea コンポーネント
 * 
 * 印刷専用エリアコンポーネントです。
 * 画面には表示されず、印刷時のみ表示されるエリアを提供します。
 * 
 * @fileoverview 印刷時にのみ表示されるエリアで、三つ折り印刷用のレイアウトを適用します。
 */

import React from "react";
import type { Itinerary } from "@/types";
import TriFoldItinerary from "./TriFoldItinerary";
import styles from "./PrintArea.module.css";

/**
 * PrintAreaコンポーネントのプロパティ型定義
 */
export interface PrintAreaProps {
  /** 印刷する旅のしおりデータ */
  itinerary: Itinerary;
  /** 表示状態（通常はfalse、印刷時のみtrue） */
  show?: boolean;
}

/**
 * 印刷専用エリアコンポーネント
 * 
 * 画面には表示されず、印刷時のみ表示されるエリアです。
 * 三つ折り印刷用のレイアウトが適用されます。
 * 
 * @param props.itinerary - 印刷する旅のしおりデータ
 * @param props.show - 表示状態（通常はfalse）
 * @returns 印刷専用エリアコンポーネント
 * @example
 * <PrintArea itinerary={itineraryData} show={false} />
 */
export default function PrintArea({ 
  itinerary, 
  show = false 
}: PrintAreaProps): React.JSX.Element {
  return (
    <div className={`${styles.printArea} ${show ? styles.show : ''}`}>
      <TriFoldItinerary data={itinerary} />
    </div>
  );
}
