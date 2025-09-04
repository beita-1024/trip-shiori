"use client";

import React from "react";
import type { Itinerary, Day, Event } from "@/types";
import { Card } from "@/components/Primitives";

/**
 * ItineraryPreviewコンポーネントのプロパティ型定義
 */
export interface ItineraryPreviewProps {
  /** 表示する旅のしおりデータ */
  itinerary: Itinerary;
}

/**
 * 日付をフォーマットする関数
 * 
 * @param date - フォーマットする日付
 * @returns フォーマットされた日付文字列（例: "2023/12/25 (月)"）
 */
function formatDate(date: Date | string | undefined): string | null {
  if (!date) return null;
  
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const dateStr = dateObj.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const weekday = new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(dateObj);
  
  return `${dateStr} (${weekday})`;
}

/**
 * 旅のしおりプレビューコンポーネント
 * 
 * 旅のしおりデータを読みやすい形式で表示するコンポーネントです。
 * 日付、曜日、イベントの時刻とタイトル、説明を表示します。
 * 
 * @param props.itinerary - 表示する旅のしおりデータ
 * @returns 旅のしおりプレビューのレンダリング結果
 * @example
 * <ItineraryPreview itinerary={itineraryData} />
 */
export const ItineraryPreview: React.FC<ItineraryPreviewProps> = ({ itinerary }) => {
  return (
    <Card elevation={1} className="max-w-2xl mx-auto p-1">
      <h1>{itinerary.title}</h1>
      <h2>{itinerary.subtitle}</h2>
      <p>{itinerary.description}</p>
      
      {itinerary.days.map((day: Day, dayIndex: number) => (
        <section key={(day as any)._uid || dayIndex}>
          <h3>{formatDate(day.date)}</h3>
          <ul>
            {day.events.map((event: Event, eventIndex: number) => (
              <li key={(event as any)._uid || eventIndex}>
                <strong>
                  {event.time} - {event.end_time}
                </strong>
                : {event.title} - {event.description}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Card>
  );
};

export default ItineraryPreview;


