"use client";

import React, { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Props = {
  id: string;
  children: (bind: { attributes: any; listeners: any }) => React.ReactNode;
};

/**
 * ドラッグアンドドロップ可能なイベントコンポーネント
 * 
 * dnd-kitライブラリを使用して、イベントの並べ替え機能を提供します。
 * SSRとの互換性を保つため、マウント後にのみdnd-kitの属性を適用します。
 * 
 * @param props.id - ソート可能アイテムの一意識別子
 * @param props.children - レンダリング関数（ドラッグ属性とリスナーを受け取る）
 * @returns ドラッグ可能なイベントコンポーネント
 * @example
 * <SortableEvent id="event-1-0">
 *   {({ attributes, listeners }) => (
 *     <div {...attributes} {...listeners}>イベント内容</div>
 *   )}
 * </SortableEvent>
 */
export const SortableEvent: React.FC<Props> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const style: React.CSSProperties = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
    zIndex: isDragging ? 999 : undefined,
  };

  // During SSR we avoid passing dnd-kit generated attributes/listeners to prevent
  // hydration mismatches (they can include dynamic ids like aria-describedby).
  const safeAttributes = mounted ? attributes : {};
  const safeListeners = mounted ? listeners : {};

  return (
    <div ref={setNodeRef} style={style}>
      {children({ attributes: safeAttributes, listeners: safeListeners })}
    </div>
  );
};

export default SortableEvent;


