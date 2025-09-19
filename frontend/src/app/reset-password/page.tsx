import { Suspense } from 'react';
import ResetPasswordFeature from "./ResetPasswordFeature";

/**
 * パスワード再設定ページ
 * 
 * メールのリンクから遷移してくるパスワード再設定画面を提供します。
 * クエリパラメータでuidとtokenを受け取り、新しいパスワードを設定できます。
 */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <section className="min-h-screen flex items-center justify-center bg-app">
        <div className="max-w-md mx-auto p-8 text-center">
          <div className="mb-4">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
          </div>
          <h1 className="text-xl font-bold mb-4">読み込み中...</h1>
          <p className="text-body">
            しばらくお待ちください...
          </p>
        </div>
      </section>
    }>
      <ResetPasswordFeature />
    </Suspense>
  );
}
