import ResetPasswordFeature from "./ResetPasswordFeature";

/**
 * パスワード再設定ページ
 * 
 * メールのリンクから遷移してくるパスワード再設定画面を提供します。
 * クエリパラメータでuidとtokenを受け取り、新しいパスワードを設定できます。
 */
export default function ResetPasswordPage() {
  return <ResetPasswordFeature />;
}
