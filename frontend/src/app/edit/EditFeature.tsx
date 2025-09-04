"use client";

import type { Day, Event } from "@/types";
import React, { useEffect } from "react";
import { Card, Button, InputWithPlaceholder, TextareaWithPlaceholder, DateInputWithWeekday, Spinner, IconRadioGroup, ActionIconButton } from "@/components/Primitives";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import SortableEvent from "./SortableEvent";
import ItineraryPreview from "@/components/ItineraryPreview";
import TriFoldPrintPreview from "@/components/TriFoldPrintPreview";
import useItineraryStore, { openPrintPreviewStub, shareUrlStub, startAiChatEditStub, startAiVoiceInputStub } from "@/components/itineraryStore";
import { PlusIcon, SparklesIcon, TrashIcon } from "@heroicons/react/24/solid";
import iconItems from "@/components/iconItems";

/**
 * 時刻形式を正規化する関数
 * 
 * 印刷プレビュー用に時刻を統一された形式に変換します。
 * ISO形式（2023-10-01T10:00:00）やHH:MM形式を処理します。
 * 
 * @param timeStr - 正規化する時刻文字列
 * @returns 正規化された時刻文字列（HH:MM形式）、無効な場合は空文字
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
 * 旅程編集機能のメインコンポーネント
 * 
 * ユーザーが旅程を編集できる包括的なインターフェースを提供します。
 * イベントの追加、削除、並べ替えを含み、ドラッグアンドドロップ機能を利用して
 * イベントを管理します。LocalStorageと統合されており、データの永続性を提供します。
 * 
 * 主な機能：
 * - 旅程の基本情報編集（タイトル、サブタイトル、概要）
 * - 日別イベントの管理（追加、削除、並べ替え）
 * - AI補完機能
 * - 印刷プレビュー
 * - 共有URL生成
 * - Undo/Redo機能
 * 
 * @returns レンダリングされたEditFeatureコンポーネント
 */
export default function EditFeature() {
  // useItineraryStore によって LocalStorage からのロードと自動保存が行われます
  const [
    itinerary,
    setItinerary,
    aiCompleteEvent,
    aiEditItinerary,
    resetItinerary,
    shareItinerary,
    _loadSharedItinerary,
    undo,
    redo,
    canUndo,
    canRedo
  ] = useItineraryStore();

  // 状態管理
  const [sharedUrl, setSharedUrl] = React.useState<string>("");
  const [showPrintPreview, setShowPrintPreview] = React.useState(false);
  const [showTriFoldPrintPreview, setShowTriFoldPrintPreview] = React.useState(false);
  const [showShareDialog, setShowShareDialog] = React.useState(false);
  const [shareLoading, setShareLoading] = React.useState(false);
  const [shareError, setShareError] = React.useState<string>("");
  const [showAiDialog, setShowAiDialog] = React.useState(false);
  const [aiInput, setAiInput] = React.useState("");
  const [aiLoading, setAiLoading] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string>("");
  const [showToast, setShowToast] = React.useState(false);

  // ドラッグアンドドロップ用のセンサー
  const sensors = useSensors(useSensor(PointerSensor));

  // AI補完ボタンのローディング状態を管理（イベント単位）
  const [loadingKeys, setLoadingKeys] = React.useState<Set<string>>(new Set());

  // 離脱ガード（履歴がある場合に確認）
  const hasHistory = canUndo || canRedo;

  /**
   * キーボードショートカットの処理
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Esc: ダイアログを閉じる
      if (event.key === 'Escape') {
        if (showTriFoldPrintPreview) {
          event.preventDefault();
          setShowTriFoldPrintPreview(false);
        } else if (showShareDialog) {
          event.preventDefault();
          setShowShareDialog(false);
        } else if (showAiDialog) {
          event.preventDefault();
          setShowAiDialog(false);
        }
        return;
      }
      
      // Ctrl+Z: Undo
      if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (canUndo) undo();
      }
      
      // Ctrl+Y: Redo
      if (event.ctrlKey && event.key === 'y') {
        event.preventDefault();
        if (canRedo) redo();
      }
      
      // Ctrl+Alt+P: 印刷プレビュー
      if (event.ctrlKey && event.altKey && event.key === 'p') {
        event.preventDefault();
        setShowTriFoldPrintPreview(true);
      }
      
      // Ctrl+Alt+S: 共有リンク生成
      if (event.ctrlKey && event.altKey && event.key === 's') {
        event.preventDefault();
        handleShareItinerary();
      }
      
      // Ctrl+Alt+L: AI対話形式で編集
      if (event.ctrlKey && event.altKey && event.key === 'l') {
        event.preventDefault();
        setShowAiDialog(true);
        // 次のフレームでテキストエリアにフォーカス
        setTimeout(() => {
          aiTextareaRef.current?.focus();
        }, 100);
      }
      
      // Ctrl+Enter: AI対話送信（ダイアログが開いている場合のみ）
      if (event.ctrlKey && event.key === 'Enter' && showAiDialog) {
        event.preventDefault();
        handleAiEditSubmit();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [canUndo, canRedo, showAiDialog, aiInput, showTriFoldPrintPreview, showShareDialog]);

  /**
   * 共有リンク生成の処理
   */
  const handleShareItinerary = async () => {
    setShareError("");
    setShowShareDialog(true);
    setShareLoading(true);
    try {
      const url = await shareItinerary();
      if (url) {
        setSharedUrl(url);
      } else {
        setShareError("共有URLの生成に失敗しました。");
      }
    } catch (e) {
      console.error(e);
      setShareError("共有URLの生成に失敗しました。");
    } finally {
      setShareLoading(false);
    }
  };

  /**
   * AI対話送信の処理
   */
  const handleAiEditSubmit = async () => {
    if (!aiInput.trim()) {
      showToastMessage("編集内容を入力してください", 2000);
      return;
    }
    
    setAiLoading(true);
    try {
      const result = await aiEditItinerary(aiInput.trim());
      if (result.success) {
        setAiInput("");
        setShowAiDialog(false);
        if (result.changeDescription) {
          showToastMessage(`✅ ${result.changeDescription}`, 15000); // 3倍の15秒
        } else {
          showToastMessage("✅ 旅程を編集しました", 9000); // 3倍の9秒
        }
      } else {
        showToastMessage(`❌ ${result.error || "旅程編集に失敗しました"}`, 15000); // 3倍の15秒
      }
    } catch (error) {
      console.error("AI旅程編集エラー:", error);
      showToastMessage("❌ 旅程編集中にエラーが発生しました", 15000); // 3倍の15秒
    } finally {
      setAiLoading(false);
    }
  };

  /**
   * トースト通知を表示する関数
   * 
   * @param message - 表示するメッセージ
   * @param duration - 表示時間（ミリ秒、デフォルト3000ms）
   */
  const showToastMessage = (message: string, duration: number = 3000) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, duration);
  };

  // AI対話ダイアログのテキストエリアの参照
  const aiTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  
  /**
   * ページ離脱時の確認ダイアログを設定
   * 
   * 編集履歴がある場合、ページを離れる前に確認ダイアログを表示します。
   * ブラウザのリロード/タブ閉じとリンククリックでのページ遷移の両方に対応します。
   */
  useEffect(() => {
    if (!hasHistory) return;
    
    const confirmMessage = "編集内容は保存済みですが、操作履歴（Undo/Redo）は失われます。ページを移動してもよろしいですか？";

    // ブラウザのリロード/タブ閉じなど
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome等はメッセージを無視するが returnValue を設定するとダイアログが出る
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // リンククリックでのページ遷移を捕捉してカスタム確認
    const handleDocumentClick = (ev: MouseEvent) => {
      if (!hasHistory) return;
      // 左クリックのみ対象
      if (ev.defaultPrevented || ev.button !== 0) return;
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      
      // 新規タブなどは除外
      if (anchor.target && anchor.target !== "") return;
      
      const href = anchor.href;
      if (!href) return;
      
      // 同一ページ内のハッシュ移動は除外
      const sameBase = href.split("#")[0] === window.location.href.split("#")[0];
      if (sameBase && href.includes("#")) return;
      
      // 実際に遷移しそうなら確認
      const ok = window.confirm(confirmMessage);
      if (!ok) {
        ev.preventDefault();
        ev.stopPropagation();
      }
    };
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [canUndo, canRedo, hasHistory]);

  /**
   * ドラッグイベントの終了を処理し、同じ日のイベントを並べ替えます
   * 
   * @param event - ドラッグ終了イベントで、ドラッグされたアイテムに関する情報を含みます
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = event.active.id as string;
    const overId = (event.over && (event.over.id as string)) || null;
    if (!overId) return;

    // イベントアイテムのドラッグのみを処理
    if (!(activeId.startsWith("event-") && overId.startsWith("event-"))) return;

    const [_a, aDayStr, aIndexStr] = activeId.split("-");
    const [_b, bDayStr, bIndexStr] = overId.split("-");
    const aDay = parseInt(aDayStr, 10);
    const aIndex = parseInt(aIndexStr, 10);
    const bDay = parseInt(bDayStr, 10);
    const bIndex = parseInt(bIndexStr, 10);

    // 禁止: 日をまたいだ移動はさせない
    if (aDay !== bDay) return;

    const newDays = [...itinerary.days];
    const activeEvent = newDays[aDay].events[aIndex];
    // 元の位置から削除
    newDays[aDay] = { ...newDays[aDay], events: newDays[aDay].events.filter((_, i) => i !== aIndex) };
    // 目標位置に挿入
    const targetEvents = [...newDays[bDay].events];
    const insertIndex = aDay === bDay && aIndex < bIndex ? bIndex : bIndex;
    targetEvents.splice(insertIndex, 0, activeEvent);
    newDays[bDay] = { ...newDays[bDay], events: targetEvents };
    setItinerary({ ...itinerary, days: newDays });
  };

  return (
    <main>
      <div className="no-print">
        {/* 基本情報編集セクション */}
        <Card elevation={1} className="max-w-2xl mx-auto mb-4">
          <InputWithPlaceholder
            id="title"
            value={itinerary.title}
            onChange={(e) => setItinerary({ ...itinerary, title: e.target.value })}
            placeholder="タイトルを入力してください"
            className="my-2"
          />
          <InputWithPlaceholder
            id="subtitle"
            value={itinerary.subtitle ?? ""}
            onChange={(e) => setItinerary({ ...itinerary, subtitle: e.target.value })}
            placeholder="サブタイトルを入力してください"
            className="my-2"
          />
          <TextareaWithPlaceholder
            id="overview"
            rows={4}
            value={itinerary.description ?? ""}
            onChange={(e) => setItinerary({ ...itinerary, description: e.target.value })}
            placeholder="概要を入力してください"
            className="my-2"
          />
        </Card>

        {/* 日別編集セクション */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {itinerary.days.map((day: Day, dayIndex: number) => (
            <Card key={(day as any)._uid || `day-${dayIndex}`} elevation={1} className="max-w-2xl mx-auto mb-4">
              <section className="mb-4">
                <DateInputWithWeekday
                  id={`day-${dayIndex}-date`}
                  valueDate={day.date ? new Date(day.date) : undefined}
                  onChangeDate={(next) => {
                    const newDays = [...itinerary.days];
                    newDays[dayIndex] = { ...newDays[dayIndex], date: next };
                    setItinerary({ ...itinerary, days: newDays });
                  }}
                  className="my-2"
                />
                
                {/* イベントの並べ替え可能なリスト */}
                <SortableContext items={day.events.map((_, ei) => `event-${dayIndex}-${ei}`)} strategy={rectSortingStrategy}>
                  {day.events.map((event: Event, eventIndex: number) => (
                    <SortableEvent id={`event-${dayIndex}-${eventIndex}`} key={(event as any)._uid || `event-${dayIndex}-${eventIndex}`}>
                      {({ attributes, listeners }) => {
                        const loadingKey = `event-${dayIndex}-${eventIndex}`;
                        const isLoading = loadingKeys.has(loadingKey);
                        
                        return (
                          <div className="border border-ui rounded-md p-3 bg-surface my-2 elevation-1">
                            <div className="flex">
                              {/* ドラッグハンドル */}
                              <div className="flex-none w-10 flex items-center justify-center">
                                <div
                                  {...attributes}
                                  {...listeners}
                                  className="text-muted cursor-grab select-none touch-none"
                                  aria-label="ドラッグハンドル"
                                  role="button"
                                >
                                  <svg className="h-10 w-4" viewBox="0 0 6 24" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                                    <rect x="0" y="1" width="1.5" height="20" rx="0.75" fill="currentColor" />
                                    <rect x="2" y="1" width="1.5" height="20" rx="0.75" fill="currentColor" />
                                    <rect x="4" y="1" width="1.5" height="20" rx="0.75" fill="currentColor" />
                                  </svg>
                                </div>
                              </div>
                              
                              {/* イベント編集フォーム */}
                              <div className="flex-1">
                                <div className="grid grid-cols-4 gap-2 items-center mb-3">
                                  <InputWithPlaceholder
                                    id={`day-${dayIndex}-event-${eventIndex}-title`}
                                    value={event.title}
                                    onChange={(e) => {
                                      const newDays = [...itinerary.days];
                                      const newEvents = [...newDays[dayIndex].events];
                                      newEvents[eventIndex] = { ...newEvents[eventIndex], title: e.target.value };
                                      newDays[dayIndex] = { ...newDays[dayIndex], events: newEvents };
                                      setItinerary({ ...itinerary, days: newDays });
                                    }}
                                    placeholder="イベント名"
                                    className="col-span-4 sm:col-span-2"
                                  />
                                  <InputWithPlaceholder
                                    id={`day-${dayIndex}-event-${eventIndex}-time`}
                                    type="time"
                                    value={event.time}
                                    onChange={(e) => {
                                      const newDays = [...itinerary.days];
                                      const newEvents = [...newDays[dayIndex].events];
                                      newEvents[eventIndex] = { ...newEvents[eventIndex], time: e.target.value };
                                      newDays[dayIndex] = { ...newDays[dayIndex], events: newEvents };
                                      setItinerary({ ...itinerary, days: newDays });
                                    }}
                                    placeholder="開始時刻"
                                    className="col-span-2 sm:col-span-1"
                                  />
                                  <InputWithPlaceholder
                                    id={`day-${dayIndex}-event-${eventIndex}-end_time`}
                                    type="time"
                                    value={event.end_time}
                                    onChange={(e) => {
                                      const newDays = [...itinerary.days];
                                      const newEvents = [...newDays[dayIndex].events];
                                      newEvents[eventIndex] = { ...newEvents[eventIndex], end_time: e.target.value };
                                      newDays[dayIndex] = { ...newDays[dayIndex], events: newEvents };
                                      setItinerary({ ...itinerary, days: newDays });
                                    }}
                                    placeholder="終了時刻"
                                    className="col-span-2 sm:col-span-1"
                                  />
                                </div>
                                
                                <TextareaWithPlaceholder
                                  id={`day-${dayIndex}-event-${eventIndex}-description`}
                                  rows={3}
                                  value={event.description}
                                  onChange={(e) => {
                                    const newDays = [...itinerary.days];
                                    const newEvents = [...newDays[dayIndex].events];
                                    newEvents[eventIndex] = { ...newEvents[eventIndex], description: e.target.value };
                                    newDays[dayIndex] = { ...newDays[dayIndex], events: newEvents };
                                    setItinerary({ ...itinerary, days: newDays });
                                  }}
                                  placeholder="イベントの説明"
                                />
                                
                                {/* アイコン選択 */}
                                <IconRadioGroup
                                  value={event.icon}
                                  items={iconItems}
                                  onChange={(next) => {
                                    const newDays = [...itinerary.days];
                                    const newEvents = [...newDays[dayIndex].events];
                                    newEvents[eventIndex] = { ...newEvents[eventIndex], icon: next };
                                    newDays[dayIndex] = { ...newDays[dayIndex], events: newEvents };
                                    setItinerary({ ...itinerary, days: newDays });
                                  }}
                                  className="mb-2"
                                />
                                
                                {/* イベント操作ボタン */}
                                <div className="flex flex-col sm:flex-row justify-end gap-2 mt-2">
                                  
                                  <Button
                                      kind="destructive"
                                      type="button"
                                      disabled={day.events.length <= 1}
                                      onClick={() => {
                                        const newDays = [...itinerary.days];
                                        const newEvents = [...newDays[dayIndex].events];
                                        if (newEvents.length <= 1) return;
                                        newEvents.splice(eventIndex, 1);
                                        newDays[dayIndex] = { ...newDays[dayIndex], events: newEvents };
                                        setItinerary({ ...itinerary, days: newDays });
                                      }}
                                      elevation={0}
                                    >
                                    <TrashIcon className="w-4 h-4 sm:mr-2" aria-hidden />
                                    <span className="hidden sm:inline">削除</span>
                                    <span className="sm:hidden">削除</span>
                                  </Button>
                                  <Button
                                    kind="ghost"
                                    type="button"
                                    disabled={isLoading || day.events.length === 0 || eventIndex >= day.events.length - 1}
                                    onClick={async () => {
                                      setLoadingKeys((prev) => {
                                        const next = new Set(prev);
                                        next.add(loadingKey);
                                        return next;
                                      });
                                      try {
                                        await aiCompleteEvent(dayIndex, eventIndex);
                                      } finally {
                                        setLoadingKeys((prev) => {
                                          const next = new Set(prev);
                                          next.delete(loadingKey);
                                          return next;
                                        });
                                      }
                                    }}
                                  >
                                    {isLoading ? (
                                      <Spinner size="sm" className="sm:mr-2" />
                                    ) : (
                                      <SparklesIcon className="w-4 h-4 sm:mr-2" aria-hidden />
                                    )}
                                    <span className="hidden sm:inline">AIで下に補完</span>
                                    <span className="sm:hidden">AI補完</span>
                                  </Button>
                                  <Button
                                    kind="ghost"
                                    type="button"
                                    onClick={() => {
                                      const newDays = [...itinerary.days];
                                      const newEvents = [...newDays[dayIndex].events];
                                      const newEvent: Event = { title: "", time: "", end_time: "", description: "", icon: "" };
                                      newEvents.splice(eventIndex + 1, 0, newEvent);
                                      newDays[dayIndex] = { ...newDays[dayIndex], events: newEvents };
                                      setItinerary({ ...itinerary, days: newDays });
                                    }}
                                  >
                                    <PlusIcon className="w-4 h-4 sm:mr-2" aria-hidden />
                                    <span className="hidden sm:inline">この下にイベントを追加</span>
                                    <span className="sm:hidden">追加</span>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    </SortableEvent>
                  ))}
                </SortableContext>
                
                {/* 日操作ボタン */}
                <div className="flex justify-end gap-2 mt-2">
                  <Button
                    kind="ghost"
                    type="button"
                    onClick={() => {
                      const newDays = [...itinerary.days];
                      const newDay: Day = { date: undefined, events: [{ title: "", time: "", end_time: "", description: "", icon: "" }] };
                      newDays.splice(dayIndex + 1, 0, newDay);
                      setItinerary({ ...itinerary, days: newDays });
                    }}
                  >
                    この下に日を追加
                  </Button>
                  <Button
                    kind="destructive"
                    type="button"
                    disabled={itinerary.days.length <= 1}
                    onClick={() => {
                      const newDays = [...itinerary.days];
                      if (newDays.length <= 1) return;
                      newDays.splice(dayIndex, 1);
                      setItinerary({ ...itinerary, days: newDays });
                    }}
                  >
                    削除
                  </Button>
                </div>
              </section>
            </Card>
          ))}
        </DndContext>

        {/* 操作パネル */}
        <Card elevation={1} className="max-w-2xl mx-auto mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex flex-col gap-2 w-full">
              <div className="flex gap-2 items-center">
                <Button
                  kind="ghost"
                  type="button"
                  onClick={() => {
                    if (window.confirm("本当にデフォルトに戻しますか？現在の変更は失われます。よろしいですか？")) {
                      resetItinerary();
                    }
                  }}
                >
                  <i className="mdi mdi-restore mr-2" />
                  デフォルトに戻す
                </Button>
                {/* <Button kind="ghost" type="button" onClick={() => setShowPrintPreview(true)}>
                  <i className="mdi mdi-printer mr-2" />
                  印刷プレビュー（スタブ）
                </Button>
                <Button kind="ghost" type="button" onClick={() => setShowTriFoldPrintPreview(true)}>
                  <i className="mdi mdi-printer mr-2" />
                  三つ折り印刷プレビュー
                </Button> */}
              </div>

              {/* <div className="flex items-center gap-2 w-full">
                <Button
                  kind="ghost"
                  type="button"
                  onClick={async () => {
                    const url = await shareItinerary();
                    if (url) setSharedUrl(url);
                  }}
                >
                  <i className="mdi mdi-link-variant mr-2" />
                  共有URLを生成
                </Button>
                <input readOnly value={sharedUrl} className="flex-1 rounded-md border border-ui p-2 bg-app text-body" />
                <Button kind="ghost" type="button" aria-label="コピー" onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(sharedUrl || '');
                  } catch (e) {
                    console.error('clipboard copy failed', e);
                  }
                }}>
                  <i className="mdi mdi-content-copy" aria-hidden />
                </Button>
              </div> */}
            </div>
          </div>
        </Card>
        
        {/* 下部余白 - FCABとAI編集ダイアログのためのスペース */}
        <div className="h-108"></div>
      </div>
      {/* FCAB: Floating Center Actions Bar */}
      <div className="fcab" role="toolbar" aria-label="クイックアクション">
        <ActionIconButton 
          icon="mdi-undo" 
          kind="ghost"
          elevation={2}
          dataTip="Undo（直前の変更を取り消す） Ctrl+Z" 
          onClick={() => undo()} 
          disabled={!canUndo} 
        />
        <ActionIconButton 
          icon="mdi-redo" 
          kind="ghost"
          elevation={2}
          dataTip="Redo（取り消しをやり直す） Ctrl+Y" 
          onClick={() => redo()} 
          disabled={!canRedo} 
        />
        <ActionIconButton 
          icon="mdi-printer" 
          kind="ghost"
          elevation={2}
          dataTip="印刷プレビューを開く Ctrl+Alt+P" 
          onClick={() => setShowTriFoldPrintPreview(true)} 
        />
        <ActionIconButton
          icon="mdi-link-variant"
          kind="ghost"
          elevation={2}
          dataTip="共有URLを生成 Ctrl+Alt+S"
          onClick={handleShareItinerary}
        />
        <ActionIconButton 
          icon="mdi-robot" 
          kind="ghost"
          elevation={2}
          dataTip="AI対話形式で編集 Ctrl+Alt+L" 
          onClick={() => {
            setShowAiDialog((v) => !v);
            // ダイアログを開く場合、テキストエリアにフォーカス
            if (!showAiDialog) {
              setTimeout(() => {
                aiTextareaRef.current?.focus();
              }, 100);
            }
          }} 
        />
      </div>

      {/* 印刷専用（画面には表示しない）。ダイアログを開いている間だけ出力対象 */}
      {showPrintPreview && (
        <div className="print-area">
          <div className="print-doc">
            <div className="print-header mb-4">
              <div className="print-title">{itinerary.title || "(無題)"}</div>
              {itinerary.subtitle && (<div className="print-subtitle">{itinerary.subtitle}</div>)}
              {itinerary.description && (<div className="print-overview">{itinerary.description}</div>)}
            </div>

            <div className="print-days">
              {itinerary.days.map((day: Day, dIdx: number) => (
                <section key={(day as any)._uid || dIdx} className="print-day">
                  <div className="print-day-title">
                    {(() => {
                      if (!day.date) return `Day ${dIdx + 1}`;
                      const dateObj = new Date(day.date as any);
                      const dateStr = dateObj.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
                      const wk = new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(dateObj);
                      return `${dateStr} (${wk})`;
                    })()}
                  </div>
                  <table className="print-events">
                    <thead>
                      <tr>
                        <th className="print-th">時間</th>
                        <th className="print-th">タイトル</th>
                        <th className="print-th">内容</th>
                      </tr>
                    </thead>
                    <tbody>
                      {day.events.map((ev: Event, eIdx: number) => (
                        <tr key={(ev as any)._uid || eIdx}>
                          <td className="print-td">
                            {normalizeTimeForDisplay(ev.time || "")} 
                            {(ev.end_time ? ` - ${normalizeTimeForDisplay(ev.end_time)}` : "")}
                          </td>
                          <td className="print-td">{ev.title}</td>
                          <td className="print-td">{ev.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 共有URLダイアログ */}
      {showShareDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 no-print">
          <div className="bg-surface border border-ui rounded-lg p-4 w-[min(640px,90vw)] elevation-4 relative">
            <button
              type="button"
              className="action-icon-btn absolute right-3 top-3 z-10"
              aria-label="閉じる"
              onClick={() => setShowShareDialog(false)}
            >
              <i className="mdi mdi-close" aria-hidden />
            </button>
            <div className="text-lg font-medium mb-2">共有リンク</div>
            {shareLoading ? (
              <div className="flex items-center text-muted"><Spinner size="sm" className="mr-2" /> 生成中…</div>
            ) : shareError ? (
              <div className="text-red-600">{shareError}</div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <input readOnly value={sharedUrl} className="flex-1 rounded-md border border-input p-3 bg-input text-body" />
                  <Button kind="ghost" type="button" onClick={async () => {
                    try { await navigator.clipboard.writeText(sharedUrl || ""); } catch (e) { console.error("clipboard copy failed", e); }
                  }}>
                    <i className="mdi mdi-content-copy mr-1" aria-hidden /> コピー
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      
      {/* AI対話ダイアログ */}
      {showAiDialog && (
        <div className="no-print fixed left-1/2 -translate-x-1/2 bottom-[96px] z-50">
          <div className="bg-surface border border-ui rounded-lg p-4 w-[min(640px,90vw)] elevation-4 relative">
            <button
              type="button"
              className="action-icon-btn absolute right-3 top-3 z-10"
              aria-label="閉じる"
              onClick={() => setShowAiDialog(false)}
            >
              <i className="mdi mdi-close" aria-hidden />
            </button>
            <div className="text-lg font-medium mb-3 pr-8">AI対話形式で編集</div>
            <textarea
              ref={aiTextareaRef}
              rows={4}
              className="w-full rounded-md border border-input p-3 bg-input text-body mb-3 placeholder:text-input-placeholder"
              placeholder="例）2日目の午後に名古屋城の観光を追加して"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              disabled={aiLoading}
            />
            <div className="flex items-center justify-end gap-2">
              <Button 
                kind="ghost" 
                type="button" 
                onClick={handleAiEditSubmit}
                disabled={aiLoading || !aiInput.trim()}
              >
                {aiLoading ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    処理中...
                  </>
                ) : (
                  <>
                    <i className="mdi mdi-send mr-2" aria-hidden /> 
                    送信 (Ctrl+Enter)
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* トースト通知 */}
      {showToast && (
        <div className="no-print fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-surface border border-ui rounded-lg p-3 shadow-lg elevation-4 max-w-md">
            <div className="text-body text-sm">{toastMessage}</div>
          </div>
        </div>
      )}

      {/* 三つ折り印刷プレビューダイアログ */}
      <TriFoldPrintPreview
        data={itinerary}
        isOpen={showTriFoldPrintPreview}
        onClose={() => setShowTriFoldPrintPreview(false)}
      />
    </main>
  );
}