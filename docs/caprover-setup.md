# CapRover デプロイ設定

このドキュメントでは、GitHub Actionsを使用してCapRoverに自動デプロイするための設定方法を説明します。

## 前提条件

- CapRoverサーバーがセットアップ済み
- CapRoverアプリケーション（frontend、backend）が作成済み
- 各アプリケーションのApp Tokenが取得済み

## GitHub Secrets の設定

GitHubリポジトリのSettings > Secrets and variables > Actionsで以下のSecretsを設定してください：

### 必須のSecrets

| Secret名 | 説明 | 例 |
|---------|------|-----|
| `CAPROVER_URL` | CapRoverサーバーのURL | `https://captain.yourdomain.com` |
| `CAPROVER_TOKEN_FE` | FrontendアプリのApp Token | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `CAPROVER_TOKEN_BE` | BackendアプリのApp Token | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `CAPROVER_APP_FE` | Frontendアプリ名 | `trip-shiori-frontend` |
| `CAPROVER_APP_BE` | Backendアプリ名 | `trip-shiori-backend` |

## App Token の取得方法

1. CapRoverダッシュボードにログイン
2. 対象のアプリケーションを選択
3. 「Deployment」タブを開く
4. 「App Token」セクションで「Generate New Token」をクリック
5. 生成されたトークンをコピーしてGitHub Secretsに設定

## デプロイトリガー

以下の条件でCapRoverへの自動デプロイが実行されます：

### 自動デプロイ
- `main`ブランチにプッシュされたとき
- `infra/add-cd-caprover`ブランチにプッシュされたとき

### 手動デプロイ
- GitHub Actionsの「CapRover Deploy」ワークフローを手動実行
- 任意のブランチを指定してデプロイ可能

## デプロイプロセス

1. **コードチェックアウト**: 指定されたブランチのコードを取得
2. **Node.jsセットアップ**: Node.js 18をセットアップ
3. **依存関係インストール**: `npm ci`で依存関係をインストール
4. **環境変数検証**: 必要なCapRover環境変数が設定されているか確認
5. **CapRoverデプロイ**: Makefileの`deploy-cap`コマンドを実行
   - Backend → Frontend の順序でデプロイ
   - 各アプリケーションは指定されたブランチからデプロイ

## トラブルシューティング

### よくあるエラー

#### 1. 環境変数が設定されていない
```
❌ CAPROVER_URL is not set
❌ CapRover tokens are not set
❌ CapRover app names are not set
```
**解決方法**: GitHub Secretsに必要な環境変数を設定してください。

#### 2. App Tokenが無効
```
Error: Invalid app token
```
**解決方法**: CapRoverダッシュボードで新しいApp Tokenを生成し、GitHub Secretsを更新してください。

#### 3. アプリケーションが見つからない
```
Error: App not found
```
**解決方法**: CapRoverでアプリケーションが作成されているか、アプリ名が正しいか確認してください。

### ログの確認

デプロイの詳細なログは以下で確認できます：
1. GitHubリポジトリの「Actions」タブ
2. 「CapRover Deploy」ワークフローを選択
3. 該当する実行をクリックしてログを確認

## セキュリティ考慮事項

- App Tokenは機密情報です。GitHub Secrets以外の場所に保存しないでください
- CapRoverサーバーへのアクセスはHTTPSを使用してください
- 定期的にApp Tokenを更新することを推奨します

## 参考リンク

- [CapRover公式ドキュメント](https://caprover.com/)
- [CapRover CLI Commands](https://caprover.com/docs/cli-commands.html)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
