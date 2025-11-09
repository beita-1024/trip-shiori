import type { Itinerary } from "@/types";

/**
 * デフォルトの旅程データ（空の構造）
 * 
 * 新規作成時やリセット時に使用される空の旅程データです。
 * 今日の日付が設定されています。
 */
export const defaultItinerary: Itinerary = {
  title: "",
  subtitle: "",
  description: "",
  days: [
    {
      date: new Date(), // 今日の日付
      events: [
        {
          title: "",
          time: "",
          end_time: "",
          description: "",
          icon: ""
        }
      ]
    }
  ],
};

export default defaultItinerary;


