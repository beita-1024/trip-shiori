/**
 * API設定とユーティリティ関数
 */

// APIのベースURL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4002';

/**
 * APIリクエストのデフォルト設定
 */
export const defaultFetchOptions: RequestInit = {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * APIエンドポイントのURLを構築する
 */
export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

/**
 * 旅程関連のAPIエンドポイント
 */
export const ITINERARY_ENDPOINTS = {
  LIST: '/api/itineraries',
  DETAIL: (id: string) => `/api/itineraries/${id}`,
  CREATE: '/api/itineraries',
  UPDATE: (id: string) => `/api/itineraries/${id}`,
  DELETE: (id: string) => `/api/itineraries/${id}`,
} as const;
