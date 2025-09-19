import { Suspense } from 'react';
import VerifyEmailFeature from './VerifyEmailFeature';

/**
 * メール認証ページ
 * 
 * メール認証トークンを検証し、認証成功時にログイン画面へリダイレクトします。
 */
export default function VerifyEmailPage() {
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
      <VerifyEmailFeature />
    </Suspense>
  );
}
