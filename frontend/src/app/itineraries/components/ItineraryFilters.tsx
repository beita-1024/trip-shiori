"use client";

import React from "react";
// TODO: 共有リンクAPIの修正後に対応
// import React, { useState, useRef, useEffect } from "react";
// TODO: 共有リンクAPIの修正後に対応
// import { ShareScope, SharePermission } from "../types";

interface ItineraryFiltersProps {
  filters: {
    page: number;
    limit: number;
    sort: 'createdAt' | 'updatedAt';
    order: 'asc' | 'desc';
  };
  onFilterChange: (filters: Partial<ItineraryFiltersProps['filters']>) => void;
}

/**
 * 旅程フィルターコンポーネント
 * 
 * 旅程一覧のフィルタリング・ソート機能を提供します。
 * 共有設定、共有権限、ソート順序、表示オプションを設定できます。
 * 
 * @param filters - 現在のフィルター設定
 * @param onFilterChange - フィルター変更ハンドラー
 * @returns レンダリングされたItineraryFiltersコンポーネント
 */
// TODO: 共有リンクAPIの修正後に対応
/**
 * カスタムドロップダウンコンポーネント（チェックボックス付き）
 */
// const CheckboxDropdown = <T extends string>({
//   label,
//   options,
//   selectedValues,
//   onSelectionChange,
// }: {
//   label: string;
//   options: { value: T; label: string }[];
//   selectedValues: T[];
//   onSelectionChange: (value: T, checked: boolean) => void;
// }) => {
//   return (
//     <div className="relative">
//       <button
//         type="button"
//         className="flex items-center justify-between px-3 py-2 text-sm border border-input rounded-md bg-input text-body focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 min-w-[120px]"
//       >
//         <span>{label}</span>
//         <i className="mdi mdi-chevron-down text-sm ml-2" aria-hidden />
//       </button>
//     </div>
//   );
// };

export const ItineraryFilters: React.FC<ItineraryFiltersProps> = ({
  filters,
  onFilterChange,
}) => {

  // ソートフィールドのオプション
  const sortOptions: { value: 'createdAt' | 'updatedAt'; label: string }[] = [
    { value: 'createdAt', label: '作成日' },
    { value: 'updatedAt', label: '更新日' },
  ];

  // ソート順序のオプション
  const orderOptions: { value: 'asc' | 'desc'; label: string }[] = [
    { value: 'desc', label: '新しい順' },
    { value: 'asc', label: '古い順' },
  ];

  // 表示件数のオプション
  const limitOptions: { value: number; label: string }[] = [
    { value: 10, label: '10件' },
    { value: 20, label: '20件' },
    { value: 50, label: '50件' },
  ];


  return (
    <div className="space-y-4">
      {/* ソートと表示設定（1行） */}
      <div className="flex flex-wrap items-center gap-4">
        {/* ソート項目 */}
        <select
          value={filters.sort}
          onChange={(e) => onFilterChange({ sort: e.target.value as 'createdAt' | 'updatedAt' })}
          className="px-3 py-2 text-sm border border-input rounded-md bg-input text-body focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        >
          {sortOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        {/* ソート順序 */}
        <select
          value={filters.order}
          onChange={(e) => onFilterChange({ order: e.target.value as 'asc' | 'desc' })}
          className="px-3 py-2 text-sm border border-input rounded-md bg-input text-body focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        >
          {orderOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        {/* 表示件数 */}
        <select
          value={filters.limit}
          onChange={(e) => onFilterChange({ limit: parseInt(e.target.value) })}
          className="px-3 py-2 text-sm border border-input rounded-md bg-input text-body focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        >
          {limitOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
      </div>

      {/* TODO: 共有リンクAPIの修正後に対応 */}
      {/* 共有設定フィルター（1行） */}
      {/* <div className="flex flex-wrap items-center gap-4">
        <div className="relative">
          <button
            type="button"
            className="flex items-center justify-between px-3 py-2 text-sm border border-input rounded-md bg-input text-body focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 min-w-[120px]"
          >
            <span>共有範囲</span>
            <i className="mdi mdi-chevron-down text-sm ml-2" aria-hidden />
          </button>
        </div>
        
        <div className="relative">
          <button
            type="button"
            className="flex items-center justify-between px-3 py-2 text-sm border border-input rounded-md bg-input text-body focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 min-w-[120px]"
          >
            <span>共有権限</span>
            <i className="mdi mdi-chevron-down text-sm ml-2" aria-hidden />
          </button>
        </div>
        
        <button className="text-sm text-muted hover:text-body transition-colors">
          フィルターをリセット
        </button>
      </div> */}

      {/* TODO: 共有リンクAPIの修正後に対応 */}
      {/* アクティブフィルター表示 */}
      {/* <div className="pt-3 border-t border-ui">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted">アクティブ:</span>
          
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
            プライベート
            <button className="hover:text-blue-900">
              <i className="mdi mdi-close text-xs" aria-hidden />
            </button>
          </span>
          
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
            読み取り専用
            <button className="hover:text-green-900">
              <i className="mdi mdi-close text-xs" aria-hidden />
            </button>
          </span>
        </div>
      </div> */}
    </div>
  );
};
