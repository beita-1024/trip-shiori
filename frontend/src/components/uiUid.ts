/**
 * UI用UID管理ユーティリティ
 * 
 * 旅のしおりデータのドラッグアンドドロップ時の再描画を防ぐため、
 * daysとeventsに一意のUIDを付与・管理するユーティリティ関数群です。
 * 
 * @fileoverview データ送信時には_uidを削除して送信するようにしてください。
 */

import type { Itinerary } from "@/types";

/**
 * 簡易 UID 生成関数
 * 
 * タイムスタンプとランダム値を組み合わせて一意のIDを生成します。
 * 
 * @returns 生成されたUID文字列
 * @example
 * generateUid() // "lq1x2y3z-abc123"
 */
function generateUid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
}

/**
 * 深いクローンを行い、`_uid` を days と events に付与して返す
 * 
 * 旅のしおりデータを深いクローンし、daysとeventsの各要素に
 * 一意のUIDを付与します。既存のUIDがある場合は保持します。
 * 
 * @param it - 旅のしおりデータ
 * @returns `_uid` が付与された旅のしおりデータ
 * @example
 * const itineraryWithUids = attachUids(itineraryData);
 */
export function attachUids(it: Itinerary): Itinerary {
  return {
    title: it.title,
    subtitle: it.subtitle,
    description: it.description,
    days: it.days.map(d => ({
      // TODO: _uidを追加した型を定義してanyを取り除く
      // @ts-ignore
      _uid: (d as any)._uid || generateUid(),
      date: d.date ? new Date(d.date) : undefined,
      label: (d as any).label,
      events: (d.events || []).map(e => ({
        // @ts-ignore
        _uid: (e as any)._uid || generateUid(),
        ...e,
      })),
    })),
  };
}

/**
 * `_uid` を取り除いたオブジェクトを返す（送信用）
 * 
 * 旅のしおりデータからUIDを除去し、サーバー送信用の
 * クリーンなデータを返します。
 * 
 * @param it - 旅のしおりデータ
 * @returns `_uid` が取り除かれた旅のしおりデータ
 * @example
 * const cleanData = stripUids(itineraryWithUids);
 * await fetch('/api/itineraries', { body: JSON.stringify(cleanData) });
 */
export function stripUids(it: Itinerary): Itinerary {
  // TODO: _uidを追加した型を定義してanyを取り除く
  return {
    title: it.title,
    subtitle: it.subtitle,
    description: it.description,
    days: (it.days || []).map(d => ({
      date: d.date ? new Date(d.date) : undefined,
      label: (d as any).label,
      events: (d.events || []).map(e => {
        const { _uid, ...rest } = e as any;
        return rest;
      }),
    })),
  };
}

/**
 * Eventオブジェクトから`_uid`を除去する関数
 * 
 * 単一のイベントオブジェクトからUIDを除去します。
 * 
 * @param event - イベントデータ
 * @returns `_uid`が除去されたイベントデータ
 * @example
 * const cleanEvent = stripEventUid(eventWithUid);
 */
export function stripEventUid(event: any): any {
  // TODO: _uidを追加した型を定義してanyを取り除く
  const { _uid, ...rest } = event;
  return rest;
}

/**
 * シリアライズ用ヘルパー: 日付を ISO 文字列にし、_uid を含める
 * 
 * LocalStorage保存用に旅のしおりデータをシリアライズします。
 * 日付はISO文字列に変換し、UIDは保持されます。
 * 
 * @param it - 旅のしおりデータ
 * @returns シリアライズされた旅のしおりデータ
 * @example
 * const serialized = serializeWithUids(itineraryData);
 * localStorage.setItem('itinerary', JSON.stringify(serialized));
 */
export function serializeWithUids(it: Itinerary): any {
  return {
    ...it,
    days: it.days.map(d => ({
      // @ts-ignore
      _uid: (d as any)._uid,
      ...d,
      date: d.date ? (d.date as Date).toISOString() : undefined,
    })),
  };
}

/**
 * 解析時に UID を復元して返す（保存からの復元）
 * 
 * LocalStorageから読み込んだデータを解析し、UIDを復元します。
 * 既存のUIDがない場合は新しく生成します。
 * 
 * @param data - 解析するデータ
 * @returns UID が復元された旅のしおりデータ
 * @example
 * const raw = localStorage.getItem('itinerary');
 * const parsed = JSON.parse(raw);
 * const itinerary = parseWithUids(parsed);
 */
export function parseWithUids(data: any): Itinerary {
  // TODO: _uidを追加した型を定義してanyを取り除く
  return {
    title: data.title,
    subtitle: data.subtitle,
    description: data.description,
    days: (data.days || []).map((d: any) => ({
      // @ts-ignore
      _uid: d?._uid || generateUid(),
      date: d?.date ? new Date(d.date) : undefined,
      label: d?.label,
      events: (d.events || []).map((e: any) => ({
        // @ts-ignore
        _uid: e?._uid || generateUid(),
        ...e,
      })),
    })),
  };
}

export { generateUid };
