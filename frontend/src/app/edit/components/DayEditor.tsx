"use client";

import React, { useMemo } from "react";
import { Card, Button, InputWithPlaceholder, TextareaWithPlaceholder, DateInputWithWeekday, Spinner, IconRadioGroup } from "@/components/Primitives";
import {
  DndContext,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import SortableEvent from "../SortableEvent";
import type { ItineraryWithUid, DayWithUid, EventWithUid } from "@/types";
import { PlusIcon, SparklesIcon, TrashIcon } from "@heroicons/react/24/solid";
import iconItems from "@/components/iconItems";

/**
 * 日別イベント編集セクション
 * 
 * 日別のイベント管理機能を提供します。
 * ドラッグ&ドロップによる並べ替え、イベントの追加・削除・編集が可能です。
 * ゲストモードではAI補完機能は無効化されます。
 * 
 * @param props.itinerary - 旅程データ
 * @param props.onItineraryChange - 旅程データ変更ハンドラー
 * @param props.onAiCompleteEvent - AI補完ハンドラー
 * @param props.loadingKeys - ローディング状態のキーセット
 * @param props.setLoadingKeys - ローディング状態セッター
 * @param props.isGuestMode - ゲストモード（非ログイン）かどうか
 * @returns レンダリングされたDayEditorコンポーネント
 */
interface DayEditorProps {
  itinerary: ItineraryWithUid;
  onItineraryChange: (itinerary: ItineraryWithUid) => void;
  onAiCompleteEvent: (dayIndex: number, eventIndex: number) => Promise<void>;
  loadingKeys: Set<string>;
  setLoadingKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  isGuestMode?: boolean;
  onAuthRequired?: (featureName: string) => boolean;
}

export default function DayEditor({ 
  itinerary, 
  onItineraryChange, 
  onAiCompleteEvent,
  loadingKeys,
  setLoadingKeys,
  isGuestMode = false,
  onAuthRequired
}: DayEditorProps) {
  // ドラッグアンドドロップ用のセンサー
  const sensors = useSensors(useSensor(PointerSensor));

  // すべての日のイベントIDを統合した配列
  const allEventIds = useMemo(() => {
    return itinerary.days.flatMap((day, dayIndex) =>
      day.events.map((_, eventIndex) => `event-${dayIndex}-${eventIndex}`)
    );
  }, [itinerary.days]);

  /**
   * ドラッグイベントの終了を処理し、イベントを並べ替えます（日をまたいだ移動も可能）
   * 
   * 同じ日内での移動と、異なる日間での移動の両方をサポートします。
   * 同じ日内での移動は arrayMove を使用して安全に処理します。
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = event.active.id as string;
    const overId = (event.over && (event.over.id as string)) || null;
    if (!overId) return;

    // イベントアイテムのドラッグのみを処理
    if (!(activeId.startsWith("event-") && overId.startsWith("event-"))) return;

    const [, aDayStr, aIndexStr] = activeId.split("-");
    const [, bDayStr, bIndexStr] = overId.split("-");
    const aDay = parseInt(aDayStr, 10);
    const aIndex = parseInt(aIndexStr, 10);
    const bDay = parseInt(bDayStr, 10);
    const bIndex = parseInt(bIndexStr, 10);

    // 同じ位置の場合は何もしない
    if (aDay === bDay && aIndex === bIndex) return;

    const newDays = [...itinerary.days];
    
    // 同じ日内での移動は arrayMove で安全に処理
    if (aDay === bDay) {
      const reordered = arrayMove(newDays[aDay].events, aIndex, bIndex);
      newDays[aDay] = { ...newDays[aDay], events: reordered };
      onItineraryChange({ ...itinerary, days: newDays });
      return;
    }
    
    // 異なる日間での移動
    const activeEvent = newDays[aDay].events[aIndex];
    // 元の位置から削除
    const updatedSourceEvents = newDays[aDay].events.filter((_, i) => i !== aIndex);
    // 空配列になった場合はプレースホルダーイベントを追加（dnd-kitの要件）
    if (updatedSourceEvents.length === 0) {
      updatedSourceEvents.push({
        _uid: crypto.randomUUID(),
        title: "",
        time: "",
        end_time: "",
        description: "",
        icon: "",
      });
    }
    newDays[aDay] = { ...newDays[aDay], events: updatedSourceEvents };
    // 目標位置に挿入
    const targetEvents = [...newDays[bDay].events];
    targetEvents.splice(bIndex, 0, activeEvent);
    newDays[bDay] = { ...newDays[bDay], events: targetEvents };
    onItineraryChange({ ...itinerary, days: newDays });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
      <SortableContext items={allEventIds} strategy={rectSortingStrategy}>
        {itinerary.days.map((day: DayWithUid, dayIndex: number) => (
          <Card key={day._uid || `day-${dayIndex}`} elevation={1} className="max-w-2xl mx-auto mb-4" data-tour="day-editor">
            <section className="mb-4">
              <DateInputWithWeekday
                id={`day-${dayIndex}-date`}
                valueDate={day.date ? new Date(day.date) : undefined}
                onChangeDate={(next) => {
                  const newDays = [...itinerary.days];
                  newDays[dayIndex] = { ...newDays[dayIndex], date: next };
                  onItineraryChange({ ...itinerary, days: newDays });
                }}
                className="my-2"
              />
              
              {/* イベントの並べ替え可能なリスト */}
              {day.events.map((event: EventWithUid, eventIndex: number) => (
                <SortableEvent id={`event-${dayIndex}-${eventIndex}`} key={event._uid || `event-${dayIndex}-${eventIndex}`}>
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
                                  onItineraryChange({ ...itinerary, days: newDays });
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
                                  onItineraryChange({ ...itinerary, days: newDays });
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
                                  onItineraryChange({ ...itinerary, days: newDays });
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
                                onItineraryChange({ ...itinerary, days: newDays });
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
                                onItineraryChange({ ...itinerary, days: newDays });
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
                                  onItineraryChange({ ...itinerary, days: newDays });
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
                                disabled={isLoading || day.events.length === 0 || eventIndex >= day.events.length - 1 || isGuestMode}
                                onClick={async () => {
                                  // 認証チェック
                                  if (onAuthRequired && onAuthRequired("AI補完機能")) {
                                    return;
                                  }
                                  
                                  setLoadingKeys((prev) => {
                                    const next = new Set(prev);
                                    next.add(loadingKey);
                                    return next;
                                  });
                                  try {
                                    await onAiCompleteEvent(dayIndex, eventIndex);
                                  } finally {
                                    setLoadingKeys((prev) => {
                                      const next = new Set(prev);
                                      next.delete(loadingKey);
                                      return next;
                                    });
                                  }
                                }}
                                title={isGuestMode ? "AI機能はログイン後にご利用いただけます" : undefined}
                                className={isGuestMode ? "opacity-50 cursor-not-allowed" : ""}
                                data-tour="ai-feature"
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
                                  // 新しいイベントオブジェクトを作成
                                  // - _uid: 一意の識別子としてcrypto.randomUUID()を使用
                                  // - time: 現在のイベントの終了時間（end_time）を開始時間として設定
                                  // - その他のフィールドは空文字列で初期化（ユーザーが後で入力）
                                  // - EventWithUid型に準拠した構造で作成
                                  const newEvent: EventWithUid = { 
                                    _uid: crypto.randomUUID(), 
                                    title: "", 
                                    time: event.end_time || "", 
                                    end_time: "", 
                                    description: "", 
                                    icon: "" 
                                  };
                                  newEvents.splice(eventIndex + 1, 0, newEvent);
                                  newDays[dayIndex] = { ...newDays[dayIndex], events: newEvents };
                                  onItineraryChange({ ...itinerary, days: newDays });
                                }}
                                data-tour="event-add"
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
              
              {/* 日操作ボタン */}
              <div className="flex justify-end gap-2 mt-2">
                <Button
                  kind="ghost"
                  type="button"
                  onClick={() => {
                    const newDays = [...itinerary.days];
                    const newDay: DayWithUid = { _uid: crypto.randomUUID(), date: undefined, events: [{ _uid: crypto.randomUUID(), title: "", time: "", end_time: "", description: "", icon: "" }] };
                    newDays.splice(dayIndex + 1, 0, newDay);
                    onItineraryChange({ ...itinerary, days: newDays });
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
                    onItineraryChange({ ...itinerary, days: newDays });
                  }}
                >
                  削除
                </Button>
              </div>
            </section>
          </Card>
        ))}
      </SortableContext>
    </DndContext>
  );
}
