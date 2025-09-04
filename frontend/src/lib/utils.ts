import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type Doc = {
  id: string;
  title: string;
  body: string;
};

// 例: DB から取得する実装に置き換える
export async function getDocById(id: string): Promise<Doc | null> {
  // ダミー: 10桁の数字を想定
  if (!/^\d{10}$/.test(id)) return null;
  // TODO: 実 DB fetch に置き換え
  return { id, title: `サンプルタイトル (${id})`, body: "ここに本文が入ります。" };
}
