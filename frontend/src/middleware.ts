import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js middleware for authentication-based routing
 * 
 * ルートパス（/）へのアクセス時に認証状態を判定し、適切なページにリライトします。
 * - ログイン済み: /itineraries（旅程一覧）にリライト
 * - 未ログイン: /edit（デモ編集ページ）にリライト
 * 
 * @param request - Next.js request object
 * @returns NextResponse with rewrite or original response
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // ルートパスのみ処理
  if (pathname === '/') {
    // 認証クッキーの確認
    // バックエンドの認証システムに合わせてクッキー名を調整
    const authCookie = request.cookies.get('auth-token') || 
                      request.cookies.get('session') ||
                      request.cookies.get('jwt');
    
    // ボット向けのSEO対応（将来的なランディングページ用）
    const userAgent = request.headers.get('user-agent') || '';
    const isBot = /bot|crawler|spider|crawling/i.test(userAgent);
    
    if (isBot) {
      // ボット向けは現在はデモ編集ページを返す（将来的にランディングページに変更可能）
      return NextResponse.rewrite(new URL('/edit', request.url));
    }
    
    if (authCookie) {
      // ログイン済み -> 旅程一覧へリライト
      return NextResponse.rewrite(new URL('/itineraries', request.url));
    } else {
      // 未ログイン -> デモ編集へリライト
      return NextResponse.rewrite(new URL('/edit', request.url));
    }
  }
  
  // その他のパスはそのまま通す
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
