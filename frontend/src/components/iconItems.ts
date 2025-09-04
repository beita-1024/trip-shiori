/**
 * アイコンアイテムの型定義
 */
export interface IconItem {
  /** Material Design Iconsのクラス名（例: "mdi-map-marker"） */
  value: string;
  /** アイコンの表示名（オプション） */
  label?: string;
}

/**
 * 共有アイコンリスト
 * 
 * アイコン選択で使用されるMaterial Design Iconsのリストです。
 * 旅行関連のアイコンを中心に構成されています。
 * 
 * @example
 * // アイコン選択コンポーネントで使用
 * <IconRadioGroup items={iconItems} value={selectedIcon} onChange={setSelectedIcon} />
 */
export const iconItems: readonly IconItem[] = [
  { value: "mdi-map-marker", label: "地図" },
  { value: "mdi-walk", label: "徒歩" },
  { value: "mdi-train", label: "電車" },
  { value: "mdi-bike", label: "自転車" },
  { value: "mdi-bus", label: "バス" },
  { value: "mdi-airplane", label: "飛行機" },
  { value: "mdi-camera", label: "カメラ" },
  { value: "mdi-food", label: "食事" },
  { value: "mdi-car", label: "車" },
] as const;

export default iconItems;
