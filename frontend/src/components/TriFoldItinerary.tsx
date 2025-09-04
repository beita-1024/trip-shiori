/**
 * TriFoldItinerary コンポーネント
 * 
 * 三つ折り印刷用の旅程表示コンポーネントです。
 * Vuetify版のItineraryView.vueを参考にReactで実装されています。
 * 
 * @fileoverview 印刷時にA4横向きで3段組みレイアウトを適用し、
 * イベント間に縦点線を表示して視覚的なつながりを表現します。
 */

import React from "react";
import type { Itinerary } from "@/types";
import styles from "./TriFoldItinerary.module.css";

/**
 * TriFoldItineraryコンポーネントのプロパティ型定義
 */
export interface TriFoldItineraryProps {
  /** 表示する旅のしおりデータ */
  data: Itinerary;
}

/**
 * 時刻形式を正規化する関数（印刷プレビュー用）
 * 
 * ISO形式（2023-10-01T10:00:00）やHH:MM形式の時刻文字列を
 * 統一されたHH:MM形式に変換します。
 * 
 * @param timeStr - 正規化する時刻文字列
 * @returns 正規化された時刻文字列（HH:MM形式）または空文字
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
 * 日付をフォーマットする関数
 * 
 * 日付オブジェクトまたは文字列を日本語形式（YYYY/MM/DD）に変換します。
 * 
 * @param date - フォーマットする日付
 * @returns フォーマットされた日付文字列
 * @example
 * formatDate(new Date("2023-12-25")) // "2023/12/25"
 */
function formatDate(date: Date | string | undefined): string {
  if (!date) return "";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("ja-JP", { 
    year: "numeric", 
    month: "2-digit", 
    day: "2-digit" 
  });
}

/**
 * 曜日を取得する関数
 * 
 * 日付オブジェクトまたは文字列から日本語の曜日を取得します。
 * 
 * @param date - 曜日を取得する日付
 * @returns 日本語の曜日文字列
 * @example
 * getWeekday(new Date("2023-12-25")) // "月"
 */
function getWeekday(date: Date | string | undefined): string {
  if (!date) return "";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(dateObj);
}

/**
 * イベントアイコン表示コンポーネント
 * 
 * Material Design Iconsのクラス名を使用してアイコンを表示します。
 * 
 * @param props.icon - Material Design Iconsのクラス名
 * @returns アイコン要素またはnull
 * @example
 * <EventIcon icon="mdi-map-marker" />
 */
const EventIcon: React.FC<{ icon: string }> = ({ icon }) => {
  if (!icon) return null;
  
  // Material Design Iconsのクラス名をそのまま使用
  return <i className={`mdi ${icon} ${styles.eventIcon}`} />;
};

/**
 * 三つ折り印刷用の旅程表示コンポーネント
 * 
 * 旅のしおりデータを三つ折り印刷に適したレイアウトで表示します。
 * 印刷時はA4横向きで3段組みレイアウトが適用され、
 * イベント間に縦点線が表示されます。
 * 
 * @param props.data - 表示する旅のしおりデータ
 * @returns 三つ折り印刷用の旅程表示コンポーネント
 * @example
 * <TriFoldItinerary data={itineraryData} />
 */
export default function TriFoldItinerary({ data }: TriFoldItineraryProps): React.JSX.Element {
  return (
    <div className={styles.itinerary}>
      {/* 表紙ブロック */}
      <div className={styles.coverBlock}>
        <div className={styles.coverContent}>
          <div className={styles.coverItem}>
            <h2 className={styles.coverTitle}>タイトル</h2>
            <p>{data.title}</p>
          </div>
          <div className={styles.coverItem}>
            <h3 className={styles.coverSubtitle}>サブタイトル</h3>
            <p>{data.subtitle}</p>
          </div>
          <div className={styles.coverItem}>
            <h4 className={styles.coverDescription}>概要</h4>
            <p>{data.description}</p>
          </div>
        </div>
      </div>

      {/* 各日の行程を表示 */}
      {data.days.map((day, dayIndex) => (
        <div key={dayIndex} className={styles.dayBlock}>
          <div className={styles.dayTitle}>
            {dayIndex + 1} 日目 {formatDate(day.date)} ({getWeekday(day.date)})
          </div>

          {/* 各日のイベントを表示 */}
          {day.events.map((event, eventIndex) => (
            <div key={eventIndex} className={styles.eventBlock}>
              {/* イベントのヘッダー（時刻、アイコン、タイトル） */}
              <div className={styles.eventHeadBlock}>
                <div className={styles.eventTime}>
                  {normalizeTimeForDisplay(event.time)}
                  {event.end_time && ` - ${normalizeTimeForDisplay(event.end_time)}`}
                </div>
                <EventIcon icon={event.icon} />
                <div className={styles.eventTitle}>
                  {event.title}
                </div>
              </div>

              {/* イベントの本文（空白、縦点線、詳細） */}
              <div className={styles.eventBodyBlock}>
                {/* 時刻と同じ幅のダミー要素 */}
                <div className={styles.eventTimePlaceholder}></div>

                {/* SVG を用いた縦点線要素 */}
                <div className={styles.verticalDottedLine}>
                  <svg viewBox="0 0 2 100" xmlns="http://www.w3.org/2000/svg">
                    <line 
                      x1="1" 
                      y1="0" 
                      x2="1" 
                      y2="100" 
                      stroke="#000" 
                      strokeDasharray="4,4" 
                      strokeWidth="2" 
                    />
                  </svg>
                </div>

                {/* イベントの詳細 */}
                <div className={styles.eventDescription}>
                  {event.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
