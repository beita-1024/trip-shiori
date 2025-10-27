import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js middleware for authentication-based routing
 * 
 * ルートパス（/）へのアクセス時に認証状態を判定し、適切なページにリダイレクトします。
 * - ログイン済み: /itineraries（旅程一覧）へリダイレクト
 * - 未ログイン: /edit（デモ編集ページ）へリダイレクト
 * 
 * @param request - Next.js request object
 * @returns NextResponse with redirect or original response
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 認証クッキーの確認
  const authCookie = request.cookies.get('access_token');
  
  // 認証済みユーザーが/loginにアクセスした場合は/itinerariesにリダイレクト
  if (pathname === '/login' && authCookie) {
    return NextResponse.redirect(new URL('/itineraries', request.url));
  }
  
  // ルートパスのみ処理
  if (pathname === '/') {
    // ボット向けのSEO対応（将来的なランディングページ用）
    const userAgent = request.headers.get('user-agent') || '';
    const isBot = /bot|crawler|spider|crawling/i.test(userAgent);
    
    if (isBot) {
      // ボット向けは現在はデモ編集ページを返す（将来的にランディングページに変更可能）
      return NextResponse.rewrite(new URL('/edit', request.url));
    }
    
    if (authCookie) {
      // ログイン済み -> 旅程一覧へリダイレクト
      return NextResponse.redirect(new URL('/itineraries', request.url));
    } else {
      // 未ログイン -> デモ編集へリダイレクト
      return NextResponse.redirect(new URL('/edit', request.url));
    }
  }
  
  // その他のパスはそのまま通す
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
  ],
};
