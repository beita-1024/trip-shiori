/**
 * 現在のパス名を取得するカスタムフック
 * 
 * Next.jsのusePathnameフックをラップして、クライアントサイドでの
 * パス名取得を安全に行います。
 * 
 * @returns 現在のパス名
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const pathname = usePathname();
 *   
 *   if (pathname === '/edit') {
 *     return <div>編集ページです</div>;
 *   }
 *   
 *   return <div>その他のページです</div>;
 * }
 * ```
 */
"use client";

import { usePathname as useNextPathname } from 'next/navigation';

export function usePathname(): string {
  const pathname = useNextPathname();
  return pathname || '';
}
