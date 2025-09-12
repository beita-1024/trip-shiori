"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, Heading, Button, Spinner } from "@/components/Primitives";
import { ItineraryCard } from "./components/ItineraryCard";
import { ItineraryFilters } from "./components/ItineraryFilters";
import { Pagination } from "./components/Pagination";
import { ItineraryListItem, PaginationInfo } from "@/types";
import { buildApiUrl, ITINERARY_ENDPOINTS } from "@/lib/api";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import defaultItinerary from "@/lib/defaultItinerary";
import { stripUids } from "@/components/uiUid";

/**
 * 旅程一覧機能のメインコンポーネント
 * 
 * ユーザーの旅程一覧を表示・管理する機能を提供します。
 * フィルタリング、ソート、ページネーション、旅程の操作（編集・削除）をサポートします。
 * 
 * @returns レンダリングされたItinerariesFeatureコンポーネント
 */
export default function ItinerariesFeature() {
  const router = useRouter();
  
  // 状態管理
  const [itineraries, setItineraries] = useState<ItineraryListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { isAuthenticated } = useAuthRedirect();
  
  // フィルター・ソート状態
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    sort: 'updatedAt' as 'createdAt' | 'updatedAt',
    order: 'desc' as 'asc' | 'desc',
  });

  /**
   * 旅程一覧を取得する
   */
  const fetchItineraries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        sort: filters.sort,
        order: filters.order,
      });
      
      
      const response = await fetch(`${buildApiUrl(ITINERARY_ENDPOINTS.LIST)}?${queryParams.toString()}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setItineraries(data.itineraries || []);
      setPagination(data.pagination || null);
    } catch (err) {
      console.error('Failed to fetch itineraries:', err);
      setError(err instanceof Error ? err.message : '旅程の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // 初回読み込みとフィルター変更時の再取得
  useEffect(() => {
    if (isAuthenticated) {
      fetchItineraries();
    }
  }, [isAuthenticated, fetchItineraries]);

  /**
   * フィルター変更ハンドラー
   */
  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1, // フィルター変更時は1ページ目に戻る
    }));
    setSelectedIds(new Set()); // 選択状態をリセット
  };

  /**
   * ページ変更ハンドラー
   */
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
    setSelectedIds(new Set()); // ページ変更時は選択状態をリセット
  };

  /**
   * 旅程選択ハンドラー
   */
  const handleSelectItinerary = (id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  /**
   * 全選択/全解除ハンドラー
   */
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(new Set(itineraries.map(it => it.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  /**
   * 旅程削除ハンドラー
   */
  const handleDeleteItinerary = async (id: string) => {
    if (!confirm('この旅程を削除しますか？この操作は取り消せません。')) {
      return;
    }
    
    try {
      const response = await fetch(buildApiUrl(ITINERARY_ENDPOINTS.DELETE(id)), {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // 削除後に一覧を再取得
      await fetchItineraries();
      alert('旅程を削除しました。');
    } catch (err) {
      console.error('Failed to delete itinerary:', err);
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  /**
   * 複数削除ハンドラー
   */
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`選択した${selectedIds.size}件の旅程を削除しますか？この操作は取り消せません。`)) {
      return;
    }
    
    try {
      const deletePromises = Array.from(selectedIds).map(id =>
        fetch(buildApiUrl(ITINERARY_ENDPOINTS.DELETE(id)), {
          method: 'DELETE',
          credentials: 'include',
        })
      );
      
      await Promise.all(deletePromises);
      
      // 削除後に一覧を再取得
      await fetchItineraries();
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Failed to delete selected itineraries:', err);
      setError(err instanceof Error ? err.message : '旅程の削除に失敗しました');
    }
  };


  /**
   * 複製ハンドラー
   */
  const handleDuplicate = async (itinerary: ItineraryListItem) => {
    if (!confirm(`「${itinerary.data.title}」を複製しますか？`)) {
      return;
    }

    try {
      const response = await fetch(buildApiUrl(ITINERARY_ENDPOINTS.CREATE), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...itinerary.data,
          title: `${itinerary.data.title} (コピー)`,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 複製後に一覧を再取得
      await fetchItineraries();
      
      alert('旅程を複製しました。');
    } catch (err) {
      console.error('Failed to duplicate itinerary:', err);
      setError(err instanceof Error ? err.message : '旅程の複製に失敗しました');
    } finally {
      // 複製処理完了
    }
  };

  /**
   * 新しい旅程作成ハンドラー
   */
  const handleCreateNewItinerary = async () => {
    try {
      setLoading(true);
      setError(null);

      // デフォルトの旅程データを準備
      const stripped = stripUids(defaultItinerary);
      const payload = {
        ...stripped,
        days: (stripped.days || []).map((d) => ({
          ...d,
          date: d?.date ? (d.date as Date).toISOString() : undefined,
        })),
      };

      const response = await fetch(buildApiUrl(ITINERARY_ENDPOINTS.CREATE), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { id } = await response.json();
      if (!id) {
        throw new Error("旅程IDの取得に失敗しました");
      }

      // 作成された旅程の編集画面にリダイレクト
      router.push(`/edit/${id}`);
    } catch (err) {
      console.error('Failed to create new itinerary:', err);
      setError(err instanceof Error ? err.message : '新しい旅程の作成に失敗しました');
      setLoading(false);
    }
  };

  if (loading && itineraries.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <div className="text-center">
          <Spinner size="lg" className="mb-4" />
          <p className="text-muted">旅程を読み込み中...</p>
        </div>
      </div>
    );
  }

  // 認証されていない場合は自動的にログイン画面にリダイレクトされる
  if (isAuthenticated === false) {
    return null;
  }

  return (
    <div className="min-h-screen bg-app">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
          <div className="mb-4 sm:mb-0">
            <Heading className="mb-2">旅程一覧</Heading>
            <p className="text-muted text-sm sm:text-base">
              {pagination ? `${pagination.total}件の旅程` : '旅程を読み込み中...'}
            </p>
          </div>
          
          <div className="flex gap-2 sm:gap-3">
            <Button
              onClick={handleCreateNewItinerary}
              disabled={loading}
              className="flex items-center gap-2 text-sm sm:text-base"
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  <span className="hidden sm:inline">作成中...</span>
                  <span className="sm:hidden">作成中</span>
                </>
              ) : (
                <>
                  <i className="mdi mdi-plus" aria-hidden />
                  <span className="hidden sm:inline">新しい旅程を作成</span>
                  <span className="sm:hidden">新規作成</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <div className="flex items-center gap-2 text-red-700">
              <i className="mdi mdi-alert-circle" aria-hidden />
              <span>{error}</span>
              <Button
                kind="ghost"
                onClick={() => setError(null)}
                className="ml-auto text-sm"
              >
                <i className="mdi mdi-close" aria-hidden />
              </Button>
            </div>
          </Card>
        )}

        {/* フィルター */}
        <Card className="mb-4 sm:mb-6">
          <ItineraryFilters
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        </Card>

        {/* 選択された項目の操作 */}
        {selectedIds.size > 0 && (
          <Card className="mb-4 sm:mb-6 border-blue-200 bg-blue-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span className="text-blue-700 text-sm sm:text-base">
                {selectedIds.size}件の旅程が選択されています
              </span>
              <div className="flex gap-2">
                <Button
                  kind="destructive"
                  onClick={handleDeleteSelected}
                  className="text-sm"
                >
                  <i className="mdi mdi-delete" aria-hidden />
                  <span className="hidden sm:inline">選択した項目を削除</span>
                  <span className="sm:hidden">削除</span>
                </Button>
                <Button
                  kind="ghost"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-sm"
                >
                  選択解除
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* 旅程一覧 */}
        {itineraries.length === 0 ? (
          <Card className="text-center py-12">
            <div className="mb-4">
              <i className="mdi mdi-map-marker-outline text-4xl text-muted" aria-hidden />
            </div>
            <Heading className="mb-2">旅程がありません</Heading>
            <p className="text-muted mb-6">
              新しい旅程を作成して、旅の計画を始めましょう。
            </p>
            <Button onClick={handleCreateNewItinerary} disabled={loading}>
              {loading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  作成中...
                </>
              ) : (
                "新しい旅程を作成"
              )}
            </Button>
          </Card>
        ) : (
          <>
            {/* 全選択チェックボックス */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.size === itineraries.length && itineraries.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-input"
                />
                <span className="text-sm text-muted">
                  すべて選択 ({selectedIds.size}/{itineraries.length})
                </span>
              </label>
            </div>

            {/* 旅程カードグリッド */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {itineraries.map((itinerary) => (
                <ItineraryCard
                  key={itinerary.id}
                  itinerary={itinerary}
                  selected={selectedIds.has(itinerary.id)}
                  onSelect={(selected: boolean) => handleSelectItinerary(itinerary.id, selected)}
                  onDelete={() => handleDeleteItinerary(itinerary.id)}
                  onEdit={() => router.push(`/edit/${itinerary.id}`)}
                  onView={() => router.push(`/edit/${itinerary.id}`)}
                  onDuplicate={handleDuplicate}
                />
              ))}
            </div>

            {/* ページネーション */}
            {pagination && pagination.totalPages > 1 && (
              <Pagination
                pagination={pagination}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>

    </div>
  );
}
