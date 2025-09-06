import LoginFeature from "./LoginFeature";

/**
 * ユーザーログインページ
 * 
 * メールアドレスとパスワードでログインを行うページコンポーネントです。
 * LoginFeatureコンポーネントをラップして、ページレベルの機能を提供します。
 * 
 * @returns ユーザーログインページのレンダリング結果
 */
export default function LoginPage() {
  return <LoginFeature />;
}
