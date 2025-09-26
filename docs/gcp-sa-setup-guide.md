# GCPサービスアカウント設定ガイド

## 概要
GitHub ActionsでGCPリソースにアクセスするためのサービスアカウントの作成と設定方法を説明します。

## 前提条件
- GCPプロジェクト `portfolio-472821` へのアクセス権限
- `gcloud` CLIがインストールされている
- GCPにログイン済み

## 設定方法

### 方法1: スクリプトを使用（推奨）

#### 1. スクリプト実行
```bash
# スクリプトを実行
./scripts/setup-gcp-service-account.sh
```

#### 2. 対話式設定
スクリプトが以下の処理を自動で実行します：
- 前提条件チェック
- サービスアカウント作成
- 必要な権限を付与
- JSONキー生成
- 権限確認

### 方法2: Makeターゲットを使用

#### 1. サービスアカウント設定
```bash
# サービスアカウントを作成・設定
make setup-gcp-sa
```

#### 2. 存在確認
```bash
# サービスアカウントの存在確認
make check-gcp-sa
```

#### 3. 権限確認
```bash
# サービスアカウントの権限表示
make show-gcp-sa-permissions
```

#### 4. 一覧表示
```bash
# 全サービスアカウント一覧
make list-gcp-sa
```

## 作成されるリソース

### サービスアカウント
- **名前**: `github-actions`
- **メール**: `github-actions@portfolio-472821.iam.gserviceaccount.com`
- **説明**: GitHub Actions用サービスアカウント

### 付与される権限
| 権限 | 用途 |
|------|------|
| `roles/editor` | Cloud Run、Cloud SQL、その他GCPリソースの管理 |
| `roles/iam.serviceAccountUser` | サービスアカウントの使用 |
| `roles/storage.admin` | Terraform状態ファイル管理 |

### 生成されるファイル
- **ファイル名**: `github-actions-key.json`
- **内容**: サービスアカウントのJSONキー
- **用途**: GitHub Secretsの `GCP_SA_KEY` に設定

## GitHub Secrets設定

### 1. GitHubリポジトリにアクセス
1. GitHubリポジトリの「Settings」→「Secrets and variables」→「Actions」
2. 「New repository secret」をクリック

### 2. Secret設定
- **Name**: `GCP_SA_KEY`
- **Secret**: 生成されたJSONファイルの内容をコピー&ペースト
- 「Add secret」をクリック

### 3. 設定確認
- リポジトリの「Actions」タブから手動実行でテスト
- ワークフローが正常に実行されることを確認

## トラブルシューティング

### よくあるエラー

#### 1. 認証エラー
```
Error: authentication failed
```
**解決方法**: 
```bash
gcloud auth login
```

#### 2. 権限エラー
```
Error: permission denied
```
**解決方法**: 
- プロジェクトのOwner権限があるか確認
- 必要なAPIが有効になっているか確認

#### 3. サービスアカウント作成エラー
```
Error: service account already exists
```
**解決方法**: 
- 既存のサービスアカウントを使用
- または既存のサービスアカウントを削除して再作成

### 権限確認コマンド

#### 現在の権限確認
```bash
# プロジェクトの全権限確認
gcloud projects get-iam-policy portfolio-472821 \
  --format="table(bindings.role,bindings.members)" \
  --flatten="bindings[].members"

# サービスアカウント一覧
gcloud iam service-accounts list --project=portfolio-472821
```

#### 作成後の権限確認
```bash
# GitHub Actions用サービスアカウントの権限確認
gcloud projects get-iam-policy portfolio-472821 \
  --flatten="bindings[].members" \
  --format="table(bindings.role)" \
  --filter="bindings.members:github-actions@portfolio-472821.iam.gserviceaccount.com"
```

## セキュリティ考慮事項

### 1. 最小権限の原則
- 必要最小限の権限のみを付与
- 定期的な権限の見直し

### 2. キーの管理
- JSONキーは安全に保管
- 定期的なキーのローテーション
- 不要になったキーは削除

### 3. 監査ログ
- サービスアカウントの使用状況を監視
- 異常なアクセスパターンの検出

## 次のステップ

1. **GitHub Secrets設定**: 生成されたJSONキーを設定
2. **ワークフローテスト**: 手動実行でテスト
3. **デプロイメント確認**: 実際のデプロイを実行

## 参考資料

- [GCP IAM公式ドキュメント](https://cloud.google.com/iam/docs)
- [GitHub Actions公式ドキュメント](https://docs.github.com/ja/actions)
- [Terraform公式ドキュメント](https://www.terraform.io/docs)
