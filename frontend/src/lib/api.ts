/**
 * API設定とユーティリティ関数
 */

// APIのベースURL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002';

/**
 * APIリクエストのデフォルト設定
 */
export const defaultFetchOptions: RequestInit = {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
};

export type ExtendedRequestInit = RequestInit & {
  _isRetry?: boolean;
};

const mergeHeaders = (
  ...sources: Array<HeadersInit | undefined>
): Headers => {
  const headers = new Headers();

  sources.forEach((source) => {
    if (!source) {
      return;
    }

    const incoming = new Headers(source);
    incoming.forEach((value, key) => {
      headers.set(key, value);
    });
  });

  return headers;
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

/**
 * 認証関連のAPIエンドポイント
 */
export const AUTH_ENDPOINTS = {
  REFRESH: '/auth/refresh',
} as const;

// 認証無効化イベント（Refresh失敗や401継続時に発火）
/**
 * 認証無効化リスナーの登録セット
 *
 * Refresh Tokenの失敗や401の継続によりセッションが無効化された際、
 * 登録済みのリスナーに通知します（UI側でログアウト表示などへ同期）。
 */
export const authInvalidatedListeners = new Set<() => void>();

/**
 * 認証無効化イベントのリスナーを登録する
 *
 * @param listener 認証が無効化された際に呼ばれるハンドラ
 * @returns 解除用の関数（呼び出すと登録を解除）
 * @example
 * const unsubscribe = addAuthInvalidatedListener(() => setAuth(false));
 * // アンマウント時などに
 * unsubscribe();
 */
export const addAuthInvalidatedListener = (listener: () => void): (() => void) => {
  authInvalidatedListeners.add(listener);
  return () => authInvalidatedListeners.delete(listener);
};
const emitAuthInvalidated = (): void => {
  authInvalidatedListeners.forEach((l) => {
    try {
      l();
    } catch {
      // noop
    }
  });
};

// リフレッシュ中のリクエストをキューイング
let refreshPromise: Promise<boolean> | null = null;

/**
 * 自動Token更新機能付きfetch wrapper
 * 
 * 401エラー時に自動的にRefresh Tokenを使用してAccess Tokenを更新し、
 * 元のリクエストを再実行します。
 * 
 * @param url リクエストURL
 * @param options fetchオプション
 * @returns Promise<Response>
 * 
 * @example
 * ```typescript
 * const response = await apiFetch('/api/protected-endpoint', {
 *   method: 'GET',
 *   headers: { 'Content-Type': 'application/json' }
 * });
 * ```
 */
export const apiFetch = async (
  url: string,
  options: ExtendedRequestInit = {}
): Promise<Response> => {
  // デフォルトオプションとマージ
  const headers = mergeHeaders(defaultFetchOptions.headers, options.headers);

  const fetchOptions: ExtendedRequestInit = {
    ...defaultFetchOptions,
    ...options,
    headers,
  };

  const { _isRetry: isRetryAttempt, ...requestInit } = fetchOptions;

  // 初回リクエスト実行
  const response = await fetch(url, requestInit);

  // 401エラーかつ初回リクエストの場合、Token更新を試行
  if (response.status === 401 && !isRetryAttempt) {
    try {
      // 既にリフレッシュ中の場合は、その完了を待つ
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const refreshResponse = await fetch(buildApiUrl(AUTH_ENDPOINTS.REFRESH), {
              method: 'POST',
              credentials: 'include',
            });
            return refreshResponse.ok;
          } finally {
            // リフレッシュ完了後、少し待ってからPromiseをクリア
            // これにより、同時に発生した他の401リクエストも同じリフレッシュ結果を利用できる
            setTimeout(() => {
              refreshPromise = null;
            }, 100);
          }
        })();
      }

      const refreshSuccess = await refreshPromise;

      if (refreshSuccess) {
        // Token更新成功時、元のリクエストを再実行
        return apiFetch(url, { ...options, _isRetry: true });
      } else {
        // Refresh Tokenも無効な場合、ログインページにリダイレクト
        console.warn('Refresh token expired');
        emitAuthInvalidated();
        // /shared 配下ではリダイレクトを抑止して呼び出し側で制御させる
        if (typeof window !== 'undefined') {
          const path = window.location.pathname;
          const isSharedPath = path.startsWith('/shared/');
          if (!isSharedPath && path !== '/login' && path !== '/edit') {
            window.location.href = '/login';
          }
        }
        return response; // 元の401レスポンスを返す
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      emitAuthInvalidated();
      // エラー時は元のレスポンスを返す
    }
  }

  // 429エラーの場合、ユーザーフレンドリーなメッセージを表示
  if (response.status === 429) {
    console.warn('Rate limit exceeded');
    // 429エラーの場合は特別な処理は行わず、レスポンスをそのまま返す
    // 呼び出し元でエラーメッセージを適切に処理する
  }

  return response;
};

/**
 * 認証が必要なAPIリクエスト用のヘルパー関数
 * 
 * @param endpoint APIエンドポイント
 * @param options fetchオプション
 * @returns Promise<Response>
 */
export const authenticatedFetch = async (
  endpoint: string,
  options: ExtendedRequestInit = {}
): Promise<Response> => {
  return apiFetch(buildApiUrl(endpoint), options);
};
