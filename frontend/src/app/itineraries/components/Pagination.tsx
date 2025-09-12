"use client";

import React from "react";
import { PaginationInfo } from "@/types";

interface PaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
}

/**
 * ページネーションコンポーネント
 * 
 * 旅程一覧のページネーション機能を提供します。
 * 前へ/次へボタン、ページ番号、ページ情報を表示します。
 * 
 * @param pagination - ページネーション情報
 * @param onPageChange - ページ変更ハンドラー
 * @returns レンダリングされたPaginationコンポーネント
 */
export const Pagination: React.FC<PaginationProps> = ({
  pagination,
  onPageChange,
}) => {
  const { page, totalPages, hasNext, hasPrev, total, limit } = pagination;

  // 表示するページ番号を計算
  const getVisiblePages = () => {
    const delta = 2; // 現在のページの前後に表示するページ数
    const range = [];
    const rangeWithDots = [];

    // 基本的な範囲を計算
    for (
      let i = Math.max(2, page - delta);
      i <= Math.min(totalPages - 1, page + delta);
      i++
    ) {
      range.push(i);
    }

    // 最初のページを追加
    if (page - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    // 中間のページを追加
    rangeWithDots.push(...range);

    // 最後のページを追加
    if (page + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();

  // 開始と終了のアイテム番号を計算
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* ページ情報 */}
      <div className="text-sm text-muted">
        {total > 0 ? (
          <>
            {startItem}〜{endItem}件目 / 全{total}件
          </>
        ) : (
          '0件'
        )}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* 前へボタン */}
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrev}
            className="flex items-center gap-1 px-3 py-2 text-sm border border-input rounded-md bg-input text-body hover:bg-ui/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <i className="mdi mdi-chevron-left" aria-hidden />
            前へ
          </button>

          {/* ページ番号 */}
          <div className="flex items-center gap-1">
            {visiblePages.map((pageNum, index) => {
              if (pageNum === '...') {
                return (
                  <span
                    key={`dots-${index}`}
                    className="px-2 py-2 text-sm text-muted"
                  >
                    ...
                  </span>
                );
              }

              const pageNumber = pageNum as number;
              const isCurrentPage = pageNumber === page;

              return (
                <button
                  key={pageNumber}
                  onClick={() => onPageChange(pageNumber)}
                  className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                    isCurrentPage
                      ? 'bg-accent text-white border-accent'
                      : 'border-input bg-input text-body hover:bg-ui/50'
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>

          {/* 次へボタン */}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNext}
            className="flex items-center gap-1 px-3 py-2 text-sm border border-input rounded-md bg-input text-body hover:bg-ui/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            次へ
            <i className="mdi mdi-chevron-right" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
};
