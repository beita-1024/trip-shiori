# Terraform状態管理移行ガイド

## 概要
ローカル環境とGitHub ActionsでTerraform状態を共有するための移行手順を説明します。

## 現在の問題

### 問題の原因
1. **ローカルとGitHub Actionsで同じリソースを管理**
2. **Terraform状態の不整合**
3. **既存リソースとの競合エラー**

### エラーの例
```
Error: Error creating Network: googleapi: Error 409: The resource 'projects/portfolio-472821/global/networks/trip-shiori-dev-vpc' already exists, alreadyExists
Error: Error creating Service: googleapi: Error 409: Resource 'trip-shiori-dev-frontend' already exists.
```

## 解決方法

### 方法1: リモート状態管理（推奨）

#### 1. GCSバケットの作成
```bash
# Terraform状態用のGCSバケットを作成
gsutil mb gs://trip-shiori-terraform-state

# バケットの確認
gsutil ls gs://trip-shiori-terraform-state
```

#### 2. バックエンド設定の追加
既に以下のファイルが作成済み：
- `terraform/environments/dev/backend.tf`
- `terraform/environments/prod/backend.tf`

#### 3. 状態移行の実行

##### 開発環境の移行
```bash
# 開発環境の状態をバックアップ
cd terraform/environments/dev
cp terraform.tfstate terraform.tfstate.backup.$(date +%Y%m%d_%H%M%S)

# 状態をリモートに移行
terraform init -migrate-state
```

##### 本番環境の移行
```bash
# 本番環境の状態をバックアップ
cd terraform/environments/prod
cp terraform.tfstate terraform.tfstate.backup.$(date +%Y%m%d_%H%M%S)

# 状態をリモートに移行
terraform init -migrate-state
```

### 方法2: 既存リソースの削除

#### 開発環境のリセット
```bash
# 開発環境のリソースを削除
make destroy-gcp-dev

# 状態ファイルを削除
rm terraform/environments/dev/terraform.tfstate*
```

#### 本番環境のリセット
```bash
# 本番環境のリソースを削除（注意：データが失われます）
make destroy-gcp-prod

# 状態ファイルを削除
rm terraform/environments/prod/terraform.tfstate*
```

## 推奨する移行手順

### 段階的移行（推奨）

#### ステップ1: 開発環境の移行
```bash
# 1. 開発環境の状態をバックアップ
cd terraform/environments/dev
cp terraform.tfstate terraform.tfstate.backup.$(date +%Y%m%d_%H%M%S)

# 2. 状態をリモートに移行
terraform init -migrate-state

# 3. 移行の確認
terraform plan
```

#### ステップ2: GitHub Actionsでのテスト
```bash
# テスト用ブランチでGitHub Actionsを実行
git checkout -b test-staging
git push origin test-staging
```

#### ステップ3: 本番環境の移行
```bash
# 1. 本番環境の状態をバックアップ
cd terraform/environments/prod
cp terraform.tfstate terraform.tfstate.backup.$(date +%Y%m%d_%H%M%S)

# 2. 状態をリモートに移行
terraform init -migrate-state

# 3. 移行の確認
terraform plan
```

## 移行後の運用

### ローカル開発
```bash
# ローカルでの作業
cd terraform/environments/dev
terraform plan
terraform apply
```

### GitHub Actions
- 自動的にリモート状態を使用
- ローカルとGitHub Actionsで同じ状態を共有

### 状態の確認
```bash
# リモート状態の確認
terraform show

# 状態の一覧表示
terraform state list
```

## トラブルシューティング

### よくある問題

#### 1. 状態移行エラー
```
Error: Failed to get existing workspaces
```
**解決方法**: 
```bash
# バックエンド設定を確認
cat terraform/environments/dev/backend.tf

# 手動で状態を移行
terraform init -migrate-state -reconfigure
```

#### 2. リソース競合エラー
```
Error: Resource already exists
```
**解決方法**: 
```bash
# 既存リソースをインポート
terraform import google_compute_network.main projects/portfolio-472821/global/networks/trip-shiori-dev-vpc
```

#### 3. 権限エラー
```
Error: Access denied
```
**解決方法**: 
```bash
# GCSバケットの権限を確認
gsutil iam get gs://trip-shiori-terraform-state
```

## セキュリティ考慮事項

### 1. 状態ファイルの保護
- GCSバケットの暗号化を有効化
- アクセス権限の最小化
- 定期的なバックアップ

### 2. 状態の監査
- 状態変更のログ記録
- 異常な変更の検出
- 定期的な状態確認

### 3. アクセス制御
- サービスアカウントの最小権限
- 状態ファイルへのアクセス制限
- 定期的な権限見直し

## 移行チェックリスト

### 移行前
- [ ] 現在の状態をバックアップ
- [ ] GCSバケットの作成
- [ ] バックエンド設定の確認
- [ ] 権限の確認

### 移行中
- [ ] 開発環境の移行
- [ ] GitHub Actionsでのテスト
- [ ] 本番環境の移行
- [ ] 動作確認

### 移行後
- [ ] ローカル環境での動作確認
- [ ] GitHub Actionsでの動作確認
- [ ] 状態の整合性確認
- [ ] バックアップの確認

## 参考資料

- [Terraform Backend公式ドキュメント](https://www.terraform.io/docs/language/settings/backends/gcs.html)
- [GCS公式ドキュメント](https://cloud.google.com/storage/docs)
- [Terraform State公式ドキュメント](https://www.terraform.io/docs/language/state/index.html)
