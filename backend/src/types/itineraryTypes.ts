/**
 * 旅程編集機能で使用する型定義
 */

/**
 * イベント情報
 */
export interface Event {
  time: string;
  end_time: string;
  title: string;
  description: string;
  icon: string;
}

/**
 * 日付情報
 * @property date - ISO 8601形式の日付文字列（例: "2024-01-15"）。Date.parse()で解析可能な形式をサポート
 */
export interface Day {
  date?: string;
  events: Event[];
}

/**
 * 旅程情報
 */
export interface Itinerary {
  title: string;
  subtitle?: string;
  description?: string;
  days: Day[];
}

/**
 * 旅程編集リクエスト
 */
export interface ItineraryEditRequest {
  /** 元の旅程データ */
  originalItinerary: Itinerary;
  /** ユーザーが入力した変更内容（プロンプト） */
  editPrompt: string;
}

/**
 * 旅程編集レスポンス
 */
export interface ItineraryEditResponse {
  /** 変更後の旅程データ */
  modifiedItinerary: Itinerary;
  /** 旅程の差分（JSON patch） */
  diffPatch: any;
  /** 変更内容の自然言語説明 */
  changeDescription: string;
}

/**
 * JSON差分パッチの型定義
 */
export interface JsonPatch {
  [key: string]: any;
}
