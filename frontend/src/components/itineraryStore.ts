/**
 * 旅のしおりデータ管理カスタムフック
 * 
 * LocalStorage からの読み込みと自動保存を行い、旅のしおりデータを管理します。
 * デフォルトの旅のしおりデータを提供し、AI補完機能も含みます。
 * 
 * @fileoverview ドラッグアンドドロップしたときに再描画しないために、
 *               _uidをItineraryに入れてるため、
 *               データ送信時に_uidを削除して送信するようにしてください。
 */
"use client";

import { useEffect, useState, useRef } from "react";
import type { Itinerary, ItineraryWithUid, Event, EventWithUid } from "@/types";
import defaultItinerary from "@/lib/defaultItinerary";
import { attachUids, parseWithUids, serializeWithUids, generateUid } from "./uiUid";
import { buildApiUrl, ITINERARY_ENDPOINTS, API_BASE_URL } from "@/lib/api";

/** TODO: LocalStorageは遅いので、別の保存方法を検討する。*/
/** TODO: Undo/Redoにもデバウンス処理を入れる。 */

/** LocalStorageのキー名 */
const STORAGE_KEY = "itinerary";

/** LocalStorageへの自動保存遅延時間（ミリ秒） */
const AUTO_SAVE_DELAY_MS = 800;

/** WebAPIへの自動保存遅延時間（ミリ秒） */
const API_SAVE_DELAY_MS = 3000;

/**
 * 時間値を正規化する関数
 * 
 * "24:00" や "24:15" などの無効な時間値を "00:00" や "00:15" に変換します。
 * 
 * @param timeStr - 正規化する時間文字列
 * @returns 正規化された時間文字列
 * @example
 * normalizeTimeValue("24:00") // "00:00"
 * normalizeTimeValue("24:15") // "00:15"
 * normalizeTimeValue("14:30") // "14:30"
 */
function normalizeTimeValue(timeStr: string): string {
  if (!timeStr) return "";
  
  // "24:" で始まる時間を "00:" に変換
  if (timeStr.startsWith("24:")) {
    return "00:" + timeStr.substring(3);
  }
  
  return timeStr;
}

/**
 * イベントの時間値を正規化する関数
 * 
 * @param event - 正規化するイベント
 * @returns 正規化されたイベント
 */
function normalizeEventTimes(event: Event | EventWithUid): Event | EventWithUid {
  if (!event || typeof event !== 'object') return event;
  
  return {
    ...event,
    time: normalizeTimeValue(event.time || ""),
    end_time: normalizeTimeValue(event.end_time || ""),
  };
}

/**
 * 旅程データの時間値を正規化する関数
 * 
 * @param itinerary - 正規化する旅程データ
 * @returns 正規化された旅程データ
 */
function normalizeItineraryTimes(itinerary: Itinerary | ItineraryWithUid): Itinerary | ItineraryWithUid {
  if (!itinerary || typeof itinerary !== 'object' || !('days' in itinerary)) return itinerary;
  
  return {
    ...itinerary,
    days: itinerary.days.map((day) => {
      if (typeof day !== 'object' || !day) return day;
      return {
        ...day,
        events: (day.events || []).map(normalizeEventTimes),
      };
    }),
  };
}

/**
 * AIによる旅程編集を行う関数
 * 
 * 現在の旅程データと編集プロンプトをAPIに送信し、AIが編集した旅程を取得します。
 * 
 * @param itinerary - 現在の旅のしおりデータ
 * @param setItinerary - 旅のしおりデータを更新する関数
 * @param editPrompt - 編集プロンプト
 * @returns Promise<{success: boolean, changeDescription?: string, error?: string}>
 * @example
 * const result = await aiEditItineraryImpl(itinerary, setItinerary, "2日目に観光地を追加してください");
 */
export async function aiEditItineraryImpl(
  itinerary: Itinerary,
  setItinerary: (next: Itinerary) => void,
  editPrompt: string
): Promise<{success: boolean, changeDescription?: string, error?: string}> {
  try {
    // APIに送信するデータを準備（Itinerary型なので_uidは含まれていない）
    const cleanItinerary = itinerary;
    
    console.debug("=== AI旅程編集 デバッグ情報 ===");
    console.debug("編集プロンプト:", editPrompt);
    console.debug("送信する旅程データ:", cleanItinerary);
    
    const requestBody = {
      originalItinerary: cleanItinerary,
      editPrompt: editPrompt
    };
    
    console.debug("送信するリクエストボディ:", requestBody);
    console.debug("=== デバッグ情報終了 ===");

    const response = await fetch(buildApiUrl("/api/ai/itinerary-edit"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.debug("AI旅程編集レスポンス:", result);

    if (result.success && result.data) {
      // 変更された旅程データに_uidを付与して更新
      const modifiedItinerary = attachUids(result.data.modifiedItinerary);
      const normalized = normalizeItineraryTimes(modifiedItinerary);
      setItinerary(normalized as ItineraryWithUid);
      
      return {
        success: true,
        changeDescription: result.data.changeDescription
      };
    } else {
      return {
        success: false,
        error: result.error || "旅程編集に失敗しました"
      };
    }
  } catch (error) {
    console.error("AI旅程編集エラー:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "旅程編集に失敗しました"
    };
  }
}

/**
 * AIによるイベント補完を行う関数
 * 
 * 2つのイベント間の時間を分析し、AIが適切なイベントを生成して挿入します。
 * 本番APIが失敗した場合はダミーデータにフォールバックします。
 * 
 * @param itinerary - 旅のしおりデータ
 * @param setItinerary - 旅のしおりデータを更新する関数
 * @param dayIndex - 補完を行う日付のインデックス
 * @param eventIndex - 補完を行うイベントのインデックス
 * @returns Promise<void>
 * @example
 * await aiCompleteEventImpl(itinerary, setItinerary, 0, 1);
 */
export async function aiCompleteEventImpl(
  itinerary: Itinerary,
  setItinerary: (next: Itinerary) => void,
  dayIndex: number,
  eventIndex: number
): Promise<void> {
  try {
    const day = itinerary.days[dayIndex];
    if (!day) return;
    
    const events = day.events || [];
    if (eventIndex >= events.length - 1) {
      console.warn("次のイベントが存在しません。");
      return;
    }

    const event1 = events[eventIndex];
    const event2 = events[eventIndex + 1];

    console.debug("=== AI補完 デバッグ情報 ===");
    console.debug("dayIndex:", dayIndex, "eventIndex:", eventIndex);
    console.debug("event1 (元):", event1);
    console.debug("event2 (元):", event2);
    console.debug("event1 type:", typeof event1);
    console.debug("event2 type:", typeof event2);

    const cleanEvent1 = event1;
    const cleanEvent2 = event2;

    console.debug("cleanEvent1:", cleanEvent1);
    console.debug("cleanEvent2:", cleanEvent2);
    console.debug("cleanEvent1 type:", typeof cleanEvent1);
    console.debug("cleanEvent2 type:", typeof cleanEvent2);

    const requestBody = { event1: cleanEvent1, event2: cleanEvent2 };
    console.debug("送信するリクエストボディ:", requestBody);
    console.debug("=== デバッグ情報終了 ===");

    const tryRequest = async (useDummy: boolean) => {
      const resp = await fetch(buildApiUrl("/api/ai/events/complete"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(
          useDummy ? { event1: cleanEvent1, event2: cleanEvent2, dummy: true } : { event1: cleanEvent1, event2: cleanEvent2 }
        ),
      });
      if (!resp.ok) {
        const text = await resp.text();
        
        // 429エラーの場合はユーザーフレンドリーなメッセージを返す
        if (resp.status === 429) {
          throw new Error('リクエストが多すぎます。しばらく時間をおいてから再度お試しください。');
        }
        
        throw new Error(text || `HTTP ${resp.status}`);
      }
      
      const jsonResponse = await resp.json();
      console.debug("response /api/ai/events/complete", jsonResponse);
      return jsonResponse;
    };

    let newEvent: unknown;
    try {
      newEvent = await tryRequest(false);
    } catch (err) {
      console.warn("AI本番呼び出しに失敗。ダミーへフォールバックします。", err);
      newEvent = await tryRequest(true);
    }

    const newDays = [...itinerary.days];
    const newEvents = [...newDays[dayIndex].events];
    // @ts-expect-error - newEventの型が不明なため
    newEvents.splice(eventIndex + 1, 0, { ...newEvent, _uid: generateUid() });
    newDays[dayIndex] = { ...newDays[dayIndex], events: newEvents };
    setItinerary({ ...itinerary, days: newDays });
  } catch (e) {
    console.error("AIで下に補完エラー:", e);
  }
}

/**
 * 空の旅のしおりを作成する関数
 * 
 * 最小限の構造を持つ空の旅のしおりデータを作成します。
 * 
 * @returns 空の旅のしおりデータ
 * @example
 * const emptyItinerary = createEmptyItinerary();
 */
export function createEmptyItinerary(): Itinerary {
  return {
    title: "",
    description: "",
    days: [
      {
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
    ]
  };
}

/**
 * 旅のしおりをリセットする関数
 * 
 * デフォルトの旅のしおりデータに戻し、LocalStorageにも保存します。
 * 
 * @param setItinerary - 旅のしおりデータを更新する関数
 * @example
 * resetItineraryImpl(setItinerary);
 */
export function resetItineraryImpl(setItinerary: (next: Itinerary) => void): void {
  try {
    const next = attachUids(defaultItinerary);
    const normalized = normalizeItineraryTimes(next);
    setItinerary(normalized as ItineraryWithUid);
    const serialized = JSON.stringify(serializeWithUids(normalized as ItineraryWithUid));
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) {
    console.error("Failed to reset itinerary:", e);
  }
}

/**
 * 空の旅のしおりにリセットする関数
 * 
 * 空の旅のしおりデータにリセットし、LocalStorageにも保存します。
 * 
 * @param setItinerary - 旅のしおりデータを更新する関数
 * @example
 * resetToEmptyItineraryImpl(setItinerary);
 */
export function resetToEmptyItineraryImpl(setItinerary: (next: Itinerary) => void): void {
  try {
    const emptyItinerary = createEmptyItinerary();
    const next = attachUids(emptyItinerary);
    const normalized = normalizeItineraryTimes(next);
    setItinerary(normalized as ItineraryWithUid);
    const serialized = JSON.stringify(serializeWithUids(normalized as ItineraryWithUid));
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) {
    console.error("Failed to reset to empty itinerary:", e);
  }
}

/**
 * 旅のしおりを保存する関数
 * 
 * 指定されたIDの旅のしおりデータをサーバーに送信して更新します。
 * 
 * @param itinerary - 旅のしおりデータ
 * @param id - 保存先の旅程ID
 * @returns 成功した場合はtrue、失敗した場合はfalse
 * @example
 * const success = await saveItineraryImpl(itinerary, "ITRLObo59BXiar1oBgsy");
 * if (!success) {
 *   alert("保存に失敗しました");
 * }
 */
export async function saveItineraryImpl(itinerary: Itinerary, id: string): Promise<boolean> {
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 15000);
    
    const payload = {
      ...itinerary,
      days: (itinerary.days || []).map((d: { date?: Date }) => ({
        ...d,
        date: d?.date ? (d.date as Date).toISOString() : undefined,
      })),
    };

    const response = await fetch(buildApiUrl(ITINERARY_ENDPOINTS.UPDATE(id)), {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
      },
      credentials: 'include',
      body: JSON.stringify(payload),
      signal: ac.signal,
    });
    clearTimeout(t);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`保存に失敗しました: ${text || `HTTP ${response.status}`}`);
    }

    return true;
  } catch (e) {
    console.error("旅程保存エラー:", e);
    return false;
  }
}

/**
 * 旅のしおりを共有するための関数
 * 
 * 旅のしおりデータをサーバーに送信し、共有設定を作成して共有URLを生成します。
 * 1. 旅程を作成（プライベート）
 * 2. 共有設定を作成（公開リンク）
 * 
 * @param itinerary - 旅のしおりデータ
 * @returns 共有URLまたはnull（失敗時）
 * @example
 * const shareUrl = await shareItineraryImpl(itinerary);
 * if (shareUrl) {
 *   navigator.clipboard.writeText(shareUrl);
 * }
 */
export async function shareItineraryImpl(itinerary: Itinerary): Promise<string | null> {
  try {
    const payload = {
      ...itinerary,
      days: (itinerary.days || []).map((d: { date?: Date }) => ({
        ...d,
        date: d?.date ? (d.date as Date).toISOString() : undefined,
      })),
    };

    // 1. 旅程を作成（プライベート）
    const createResponse = await fetch(buildApiUrl(ITINERARY_ENDPOINTS.CREATE), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!createResponse.ok) {
      const text = await createResponse.text();
      throw new Error(`旅程作成に失敗しました: ${text || `HTTP ${createResponse.status}`}`);
    }

    const { id } = await createResponse.json();
    if (!id) {
      throw new Error("旅程IDの取得に失敗しました");
    }

    // 2. 共有設定を作成（公開リンク）
    const shareResponse = await fetch(buildApiUrl(`/api/itineraries/${id}/share`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        permission: 'READ_ONLY',
        scope: 'PUBLIC_LINK'
      }),
    });

    if (!shareResponse.ok) {
      const text = await shareResponse.text();
      throw new Error(`共有設定の作成に失敗しました: ${text || `HTTP ${shareResponse.status}`}`);
    }

    // 共有URLを生成
    const shareUrl = `${window.location.origin}/shared/${id}`;
    return shareUrl;
  } catch (e) {
    console.error("共有URL生成エラー:", e);
    return null;
  }
}

/**
 * 共有された旅のしおりを読み込む関数
 * 
 * 指定されたIDの旅のしおりをサーバーから取得し、LocalStorageにも保存します。
 * 
 * @param id - 旅のしおりのID
 * @param setItinerary - 旅のしおりデータを更新する関数
 * @returns 成功した場合はtrue、失敗した場合はfalse
 * @example
 * const success = await loadSharedItineraryImpl("shared-id", setItinerary);
 * if (!success) {
 *   alert("共有された旅のしおりの読み込みに失敗しました");
 * }
 */
export async function loadSharedItineraryImpl(id: string, setItinerary: (next: Itinerary) => void): Promise<boolean> {
  try {
    const resp = await fetch(`${API_BASE_URL}/api/itineraries/${id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text || `HTTP ${resp.status}`);
    }
    let data: unknown = await resp.json();
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        // noop
      }
    }

    const next = parseWithUids(data as { [key: string]: unknown });
    const normalized = normalizeItineraryTimes(next);
    setItinerary(normalized as ItineraryWithUid);
    try {
      const serialized = JSON.stringify(serializeWithUids(normalized as ItineraryWithUid));
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (e) {
      console.warn("Failed to persist loaded itinerary:", e);
    }
    return true;
  } catch (e) {
    console.error("共有しおり取得エラー:", e);
    return false;
  }
}


// TODO: 戻り値の型がかなり大きいタプルになってしまっているので、
//       type UseItineraryStoreReturn を定義して、それを返すようにする。
/**
 * 旅のしおりデータ管理カスタムフック
 * 
 * LocalStorage から読み込み、編集時に自動保存する簡易フックです。
 * 破損または未保存時には渡された defaultItinerary を利用します。
 * Undo/Redo機能も含まれています。
 * 
 * @param itineraryId - 旅程ID（提供された場合、WebAPI自動保存が有効になります）
 * @returns [
 *   itinerary - 旅のしおりデータ,
 *   setItinerary - 旅のしおりデータを更新する関数,
 *   aiCompleteEvent - AIによるイベント補完を行う関数,
 *   aiEditItinerary - AIによる旅程編集を行う関数,
 *   resetItinerary - 旅のしおりをリセットする関数,
 *   shareItinerary - 旅のしおりを共有するための関数,
 *   loadSharedItinerary - 共有された旅のしおりを読み込む関数,
 *   saveItinerary - 旅のしおりを保存する関数,
 *   undo - 直前の変更を取り消す関数,
 *   redo - 取り消しをやり直す関数,
 *   canUndo - Undo可能かどうか,
 *   canRedo - Redo可能かどうか,
 *   hasUnsavedChanges - 未保存の変更があるかどうか
 * ]
 * @example
 * const [
 *   itinerary,
 *   setItinerary,
 *   aiCompleteEvent,
 *   aiEditItinerary,
 *   resetItinerary,
 *   shareItinerary,
 *   loadSharedItinerary,
 *   saveItinerary,
 *   undo,
 *   redo,
 *   canUndo,
 *   canRedo
 * ] = useItineraryStore("itinerary-id");
 */
export default function useItineraryStore(itineraryId?: string): [
  ItineraryWithUid,
  (next: ItineraryWithUid) => void,
  (dayIndex: number, eventIndex: number) => Promise<void>,
  (editPrompt: string) => Promise<{success: boolean, changeDescription?: string, error?: string}>,
  () => void,
  () => Promise<string | null>,
  (id: string) => Promise<boolean>,
  (id: string) => Promise<boolean>,
  () => void,
  () => void,
  boolean,
  boolean,
  boolean
] {
  const [itinerary, setItinerary] = useState<ItineraryWithUid>(attachUids(defaultItinerary));
  const [past, setPast] = useState<ItineraryWithUid[]>([]);
  const [future, setFuture] = useState<ItineraryWithUid[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const HISTORY_LIMIT = 50;

  const setItineraryWithHistory = (next: ItineraryWithUid) => {
    setPast((prev) => {
      const nextPast = [...prev, itinerary];
      return nextPast.length > HISTORY_LIMIT ? nextPast.slice(nextPast.length - HISTORY_LIMIT) : nextPast;
    });
    setItinerary(next);
    setFuture([]);
    setHasUnsavedChanges(true);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const init = attachUids(defaultItinerary);
        const normalized = normalizeItineraryTimes(init);
        setItinerary(normalized as ItineraryWithUid);
        setPast([]);
        setFuture([]);
        return;
      }
      const parsed = JSON.parse(raw);
      const loaded = parseWithUids(parsed);
      const normalized = normalizeItineraryTimes(loaded);
      setItinerary(normalized as ItineraryWithUid);
      setPast([]);
      setFuture([]);
    } catch (e) {
      console.error("LocalStorage から旅のしおりを読み込む際に失敗しました:", e);
      const fallback = attachUids(defaultItinerary);
      const normalized = normalizeItineraryTimes(fallback);
      setItinerary(normalized as ItineraryWithUid);
      setPast([]);
      setFuture([]);
    }
  }, []);

  const saveTimeoutRef = useRef<number | null>(null);
  const apiSaveTimeoutRef = useRef<number | null>(null);
  const isFirstSaveRef = useRef(true);
  
  // LocalStorage自動保存
  useEffect(() => {
    if (isFirstSaveRef.current) {
      isFirstSaveRef.current = false;
      return;
    }

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      try {
        const normalized = normalizeItineraryTimes(itinerary);
        const serialized = JSON.stringify(serializeWithUids(normalized as ItineraryWithUid));
        localStorage.setItem(STORAGE_KEY, serialized);
        setHasUnsavedChanges(false);
      } catch (e) {
        console.error("LocalStorage に旅のしおりを保存する際に失敗しました:", e);
      }
      saveTimeoutRef.current = null;
    }, AUTO_SAVE_DELAY_MS) as unknown as number;

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [itinerary]);

  // WebAPI自動保存（itineraryIdが提供されている場合のみ）
  useEffect(() => {
    if (!itineraryId || isFirstSaveRef.current) {
      return;
    }

    if (apiSaveTimeoutRef.current) {
      window.clearTimeout(apiSaveTimeoutRef.current);
    }
    apiSaveTimeoutRef.current = window.setTimeout(async () => {
      try {
        await saveItineraryImpl(itinerary, itineraryId);
        console.debug("WebAPI自動保存完了:", itineraryId);
        setHasUnsavedChanges(false);
      } catch (e) {
        console.error("WebAPI自動保存に失敗しました:", e);
      }
      apiSaveTimeoutRef.current = null;
    }, API_SAVE_DELAY_MS) as unknown as number;

    return () => {
      if (apiSaveTimeoutRef.current) {
        window.clearTimeout(apiSaveTimeoutRef.current);
        apiSaveTimeoutRef.current = null;
      }
    };
  }, [itinerary, itineraryId]);

  // フック内で itinerary / setItinerary を束縛したラッパーを返します
  const aiCompleteEvent = async (dayIndex: number, eventIndex: number) =>
    await aiCompleteEventImpl(itinerary, setItineraryWithHistory as (next: Itinerary) => void, dayIndex, eventIndex);

  const aiEditItinerary = async (editPrompt: string) =>
    await aiEditItineraryImpl(itinerary, setItineraryWithHistory as (next: Itinerary) => void, editPrompt);

  const resetItinerary = () => resetItineraryImpl(setItineraryWithHistory as (next: Itinerary) => void);

  const shareItinerary = async () => await shareItineraryImpl(itinerary);

  const loadSharedItinerary = async (id: string) => await loadSharedItineraryImpl(id, setItineraryWithHistory as (next: Itinerary) => void);

  const saveItinerary = async (id: string) => await saveItineraryImpl(itinerary, id);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const undo: () => void = () => {
    if (!canUndo) return;
    setPast((prevPast) => {
      const prev = [...prevPast];
      const previous = prev.pop() as ItineraryWithUid;
      setFuture((f) => [...f, itinerary]);
      setItinerary(previous);
      return prev;
    });
  };

  const redo: () => void = () => {
    if (!canRedo) return;
    setFuture((prevFuture) => {
      const nextFuture = [...prevFuture];
      const next = nextFuture.pop() as ItineraryWithUid;
      setPast((p) => [...p, itinerary]);
      setItinerary(next);
      return nextFuture;
    });
  };

  return [
    itinerary,
    (next: ItineraryWithUid) => setItineraryWithHistory(next),
    aiCompleteEvent,
    aiEditItinerary,
    resetItinerary,
    shareItinerary,
    loadSharedItinerary,
    saveItinerary,
    undo,
    redo,
    canUndo,
    canRedo,
    hasUnsavedChanges,
  ];
}
