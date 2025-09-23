# GitHub Actions設定チェックリスト

## ✅ 事前準備

- [ ] Google Cloud Consoleにアクセス可能
- [ ] プロジェクト `portfolio-472821` が選択されている
- [ ] GitHubリポジトリの管理者権限がある

## ✅ サービスアカウント作成

- [ ] サービスアカウント名: `ci-deployer`
- [ ] 説明: `GitHub Actions用CI/CDサービスアカウント`
- [ ] 権限付与:
  - [ ] `Cloud Run管理者` (`roles/run.admin`)
  - [ ] `Artifact Registry書き込み` (`roles/artifactregistry.writer`)
  - [ ] `サービスアカウントユーザー` (`roles/iam.serviceAccountUser`)
  - [ ] `Cloud SQL管理者` (`roles/cloudsql.admin`) - 必要に応じて
  - [ ] `Storage管理者` (`roles/storage.objectAdmin`) - 必要に応じて

## ✅ キー生成・設定

- [ ] JSONキーをダウンロード
- [ ] キーファイルを安全な場所に保存
- [ ] GitHub Secretsに `GCP_SA_KEY` を設定
- [ ] JSONの内容が正しく設定されている

## ✅ 動作確認

- [ ] ローカルで `make deploy-gcp-prod-auto` が成功
- [ ] GitHub Actionsでワークフローが実行される
- [ ] デプロイが正常に完了する
- [ ] アプリケーションがアクセス可能

## ✅ セキュリティ確認

- [ ] JSONキーファイルがGitにコミットされていない
- [ ] 不要な権限が付与されていない
- [ ] サービスアカウントの使用状況を監視している

## 🚨 トラブルシューティング

### 認証エラー
```
Error: The caller does not have permission
```
**解決方法**: サービスアカウントに適切な権限を付与

### 権限不足
```
Error: Permission denied
```
**解決方法**: 必要な権限を追加で付与

### キーが見つからない
```
Error: Could not load the default credentials
```
**解決方法**: GitHub Secretsの設定を確認

## 📞 サポート

問題が解決しない場合は、以下を確認してください：

1. [詳細設定ガイド](github-actions-setup.md)
2. [トラブルシューティング](github-actions-setup.md#トラブルシューティング)
3. GitHub Actionsのログを確認
4. Google Cloud Consoleのログを確認
