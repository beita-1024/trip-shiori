"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, ActionIconButton } from "@/components/Primitives";
import { ItineraryListItem } from "@/types";
import { buildApiUrl, ITINERARY_ENDPOINTS } from "@/lib/api";

interface ItineraryCardProps {
  itinerary: ItineraryListItem;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onDelete: () => void;
  onEdit: () => void;
  onView: () => void;
  onDuplicate: (itinerary: ItineraryListItem) => void;
}

/**
 * 旅程カードコンポーネント
 * 
 * 旅程一覧で表示される個別の旅程カードです。
 * 選択チェックボックス、タイトル（編集可能）、サブテキスト、メニューボタンを提供します。
 * 
 * @param itinerary - 旅程データ
 * @param selected - 選択状態
 * @param onSelect - 選択状態変更ハンドラー
 * @param onDelete - 削除ハンドラー
 * @param onEdit - 編集ハンドラー
 * @param onView - 表示ハンドラー
 * @returns レンダリングされたItineraryCardコンポーネント
 */
export const ItineraryCard: React.FC<ItineraryCardProps> = ({
  itinerary,
  selected,
  onSelect,
  onDelete,
  onEdit,
  onView,
  onDuplicate,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(itinerary.data.title);
  const [showMenu, setShowMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // タイトル編集開始
  const handleStartEdit = () => {
    setIsEditingTitle(true);
    setTitle(itinerary.data.title);
  };

  // タイトル編集完了
  const handleFinishEdit = async () => {
    if (title.trim() === itinerary.data.title) {
      setIsEditingTitle(false);
      return;
    }

    setSaving(true);
    setSaveStatus('saving');

    try {
      const response = await fetch(buildApiUrl(ITINERARY_ENDPOINTS.UPDATE(itinerary.id)), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...itinerary.data,
          title: title.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setSaveStatus('saved');
      setIsEditingTitle(false);
      
      // 2秒後にステータスをリセット
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to update title:', error);
      setSaveStatus('error');
      setTitle(itinerary.data.title); // 元のタイトルに戻す
    } finally {
      setSaving(false);
    }
  };

  // タイトル編集キャンセル
  const handleCancelEdit = () => {
    setTitle(itinerary.data.title);
    setIsEditingTitle(false);
    setSaveStatus('idle');
  };

  // props のタイトル更新に追従（編集中は上書きしない）
  useEffect(() => {
    if (!isEditingTitle) {
      setTitle(itinerary.data.title);
    }
  }, [itinerary.data.title, isEditingTitle]);

  // キーボードイベントハンドラー
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFinishEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  // タイトル編集時のフォーカス
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // メニューの外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);


  // 相対時間フォーマット
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays}日前`;
    } else if (diffHours > 0) {
      return `${diffHours}時間前`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}分前`;
    } else {
      return 'たった今';
    }
  };


  return (
    <Card className="relative group hover:elevation-3 transition-all duration-200">

      {/* カード内容 */}
      <div>
        {/* 1行目: チェックボックス、旅程名、鉛筆アイコン、メニューボタン */}
        <div className="flex items-center gap-3 mb-3">
          {/* チェックボックス */}
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
            className="w-4 h-4 rounded border-input text-accent focus:ring-accent flex-shrink-0"
          />
          
          {/* タイトル */}
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleFinishEdit}
                  className="w-full px-2 py-1 text-base sm:text-lg font-semibold text-body bg-transparent border-b border-input focus:outline-none focus:border-accent"
                  disabled={saving}
                />
                {saveStatus === 'saving' && (
                  <i className="mdi mdi-loading animate-spin text-muted" aria-hidden />
                )}
                {saveStatus === 'saved' && (
                  <i className="mdi mdi-check text-green-600" aria-hidden />
                )}
                {saveStatus === 'error' && (
                  <i className="mdi mdi-alert-circle text-red-600" aria-hidden />
                )}
              </div>
            ) : (
              <h3
                onClick={onView}
                className="text-base sm:text-lg font-semibold text-body cursor-pointer hover:text-accent transition-colors line-clamp-2"
              >
                {title}
              </h3>
            )}
          </div>
          
          {/* 編集アイコン（丸いボタンではなくアイコンのみ） */}
          {!isEditingTitle && (
            <button
              onClick={handleStartEdit}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-ui/50 rounded flex-shrink-0"
              title="名前を変更"
            >
              <i className="mdi mdi-pencil text-muted hover:text-body" aria-hidden />
            </button>
          )}
          
          {/* メニューボタン（絶対配置から相対配置に変更） */}
          <div className="flex-shrink-0" ref={menuRef}>
            <ActionIconButton
              icon="mdi-dots-vertical"
              onClick={() => setShowMenu(!showMenu)}
              dataTip="メニュー"
              elevation={1}
            />
            
            {/* ドロップダウンメニュー */}
            {showMenu && (
              <div className="absolute right-0 top-10 w-48 bg-surface border border-ui rounded-lg shadow-lg elevation-3 z-20">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onView();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-body hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors"
                  >
                    <i className="mdi mdi-eye" aria-hidden />
                    開く
                  </button>
                  <button
                    onClick={() => {
                      onEdit();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-body hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors"
                  >
                    <i className="mdi mdi-pencil" aria-hidden />
                    編集
                  </button>
                  <button
                    onClick={() => {
                      onDuplicate(itinerary);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-body hover:bg-green-50 hover:text-green-600 flex items-center gap-2 transition-colors"
                  >
                    <i className="mdi mdi-content-duplicate" aria-hidden />
                    複製
                  </button>
                  <hr className="my-1 border-ui" />
                  <button
                    onClick={() => {
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-2 transition-colors"
                  >
                    <i className="mdi mdi-delete" aria-hidden />
                    削除
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2行目: 更新日 */}
        <div className="flex items-center gap-3 text-sm">
          
          {/* 更新日 */}
          <div className="flex items-center gap-1 text-muted flex-shrink-0">
            <i className="mdi mdi-clock-outline" aria-hidden />
            <span>{formatRelativeTime(itinerary.updatedAt)}に更新</span>
          </div>
          
          
          {/* 保存ステータス表示 */}
          {saveStatus === 'saved' && (
            <div className="flex items-center gap-1 text-green-600 text-xs ml-auto">
              <i className="mdi mdi-check" aria-hidden />
              <span>保存済み</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
