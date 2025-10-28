/**
 * 共有ページ用のレイアウト
 * 認証チェックを完全にスキップし、クライアントサイドで処理する
 */
export default function SharedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}