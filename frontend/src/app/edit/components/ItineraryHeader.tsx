"use client";

import React from "react";
import { Card, InputWithPlaceholder, TextareaWithPlaceholder } from "@/components/Primitives";
import type { ItineraryWithUid } from "@/types";

/**
 * 旅程の基本情報編集セクション
 * 
 * タイトル、サブタイトル、概要の編集機能を提供します。
 * 
 * @param props.itinerary - 旅程データ（UID付き）
 * @param props.onItineraryChange - 旅程データ変更ハンドラー
 * @returns レンダリングされたItineraryHeaderコンポーネント
 */
interface ItineraryHeaderProps {
  itinerary: ItineraryWithUid;
  onItineraryChange: (itinerary: ItineraryWithUid) => void;
}

export default function ItineraryHeader({ itinerary, onItineraryChange }: ItineraryHeaderProps) {
  return (
    <Card elevation={1} className="max-w-2xl mx-auto mb-4" data-tour="basic-info-card">
      <InputWithPlaceholder
        id="title"
        value={itinerary.title}
        onChange={(e) => onItineraryChange({ ...itinerary, title: e.target.value })}
        placeholder="タイトルを入力してください"
        className="my-2"
        data-tour="basic-info-edit"
      />
      <InputWithPlaceholder
        id="subtitle"
        value={itinerary.subtitle ?? ""}
        onChange={(e) => onItineraryChange({ ...itinerary, subtitle: e.target.value })}
        placeholder="サブタイトルを入力してください"
        className="my-2"
      />
      <TextareaWithPlaceholder
        id="overview"
        rows={4}
        value={itinerary.description ?? ""}
        onChange={(e) => onItineraryChange({ ...itinerary, description: e.target.value })}
        placeholder="概要を入力してください"
        className="my-2"
      />
    </Card>
  );
}
