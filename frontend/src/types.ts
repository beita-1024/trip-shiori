export interface User {
  createdAt: string | number | Date;
  id: number;
  name: string;
  email: string;
}

export interface Event {
  time: string;
  end_time: string;
  title: string;
  description: string;
  icon: string;
}

export interface Day {
  date?: Date;
  events: Event[];
}

export interface Itinerary {
  title: string;
  subtitle?: string;
  description?: string;
  days: Day[];
}

// 共有設定関連の型定義
export type ShareScope = 'PRIVATE' | 'PUBLIC_LINK' | 'PUBLIC';
export type SharePermission = 'READ_ONLY' | 'EDIT';

export interface ItineraryShareInfo {
  permission: SharePermission;
  scope: ShareScope;
  expiresAt?: string | null;
  accessCount: number;
  lastAccessedAt?: string | null;
}

// 旅程一覧アイテム
export interface ItineraryListItem {
  id: string;
  data: Itinerary;
  createdAt: string;
  updatedAt: string;
  userId?: string | null;
  share?: ItineraryShareInfo | null;
}

// ページネーション情報
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

