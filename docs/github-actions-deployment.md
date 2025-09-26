# GitHub Actions デプロイメントガイド

## 概要
GCP+TerraformデプロイをGitHub Actionsで自動化する設定が完了しました。

## デプロイメントフロー

### 1. 開発環境（ステージング用）
- **トリガー**: `main`ブランチへのPush
- **環境**: 開発環境（dev）
- **URL**: 
  - フロントエンド: https://dev-app.trip.beita.dev
  - バックエンド: https://dev-api.trip.beita.dev

### 2. 本番環境
- **トリガー**: `v*`タグへのPush（例: `v1.0.0`）
- **環境**: 本番環境（prod）
- **URL**: 
  - フロントエンド: https://app.trip.beita.dev
  - バックエンド: https://api.trip.beita.dev

## 必要なGitHub Secrets設定

以下のSecretsをGitHubリポジトリに設定してください：

### 必須Secrets
- `GCP_SA_KEY`: GCPサービスアカウントのJSONキー
- `DB_PASSWORD_DEV`: 開発環境DBパスワード
- `DB_PASSWORD_PROD`: 本番環境DBパスワード
- `JWT_SECRET_DEV`: 開発環境JWT秘密鍵
- `JWT_SECRET_PROD`: 本番環境JWT秘密鍵
- `SMTP_USER`: SMTPユーザー名
- `SMTP_PASSWORD`: SMTPパスワード
- `OPENAI_API_KEY`: OpenAI APIキー

詳細は [GitHub Secrets設定ガイド](./github-secrets-setup.md) を参照してください。

## デプロイメント手順

### 開発環境へのデプロイ
```bash
# mainブランチにPush
git push origin main
```

### 本番環境へのデプロイ
```bash
# タグを作成してPush
git tag v1.0.0
git push origin v1.0.0
```

## ワークフローの動作確認

### 1. 手動実行テスト
GitHubリポジトリの「Actions」タブから手動実行できます：

1. 「Development Deploy」または「Production Deploy」を選択
2. 「Run workflow」をクリック
3. ブランチを選択して実行

### 2. ログ確認
- 各ステップの実行ログを確認
- エラーが発生した場合は詳細なログを確認

### 3. デプロイ結果確認
- GCP Cloud Runサービスの状態確認
- アプリケーションの動作確認

## トラブルシューティング

### よくあるエラー

#### 1. 認証エラー
```
Error: authentication failed
```
**解決方法**: `GCP_SA_KEY`の形式と内容を確認

#### 2. 権限エラー
```
Error: permission denied
```
**解決方法**: サービスアカウントの権限を確認

#### 3. リソース作成エラー
```
Error: resource creation failed
```
**解決方法**: 
- プロジェクトの課金設定を確認
- リソース制限を確認

#### 4. terraform.tfvars生成エラー
```
Error: required environment variable not set
```
**解決方法**: 必要なGitHub Secretsが設定されているか確認

### ログ確認方法

#### GitHub Actionsログ
1. リポジトリの「Actions」タブ
2. 実行されたワークフローを選択
3. 各ステップのログを確認

#### GCPログ
```bash
# Cloud Runログ
gcloud logging read "resource.type=cloud_run_revision" --limit=50

# Cloud SQLログ
gcloud logging read "resource.type=gce_instance" --limit=50
```

## セキュリティ考慮事項

### 1. Secrets管理
- GitHub Secretsは暗号化されて保存
- 本番環境のSecretsは強力なパスワードを使用
- 定期的なSecretsのローテーション

### 2. アクセス制御
- サービスアカウントの最小権限の原則
- 本番環境へのアクセス制限

### 3. 監査ログ
- GitHub Actionsの実行ログ
- GCPの操作ログ

## 運用ガイド

### 1. デプロイ前の確認事項
- [ ] 必要なSecretsが設定されている
- [ ] テストが通っている
- [ ] 本番環境の場合は十分なテストを実施

### 2. デプロイ後の確認事項
- [ ] アプリケーションが正常に動作している
- [ ] データベース接続が正常
- [ ] 外部API連携が正常

### 3. ロールバック手順
```bash
# 前のバージョンにタグを付けてデプロイ
git tag v0.9.0
git push origin v0.9.0
```

## 参考資料

- [GitHub Actions公式ドキュメント](https://docs.github.com/ja/actions)
- [Google Cloud Run公式ドキュメント](https://cloud.google.com/run/docs)
- [Terraform公式ドキュメント](https://www.terraform.io/docs)
