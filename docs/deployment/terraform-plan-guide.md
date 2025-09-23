# Terraform Plan ガイド

このドキュメントでは、Terraform Planの重要性と使用方法について詳しく説明します。

##  Planとは？

`terraform plan` は、実際の変更を実行する前に**変更内容を事前確認**できる重要な機能です。

### 主な機能
- **変更内容の表示**: 作成・更新・削除されるリソースを一覧表示
- **安全性の確保**: 予期しない変更を防止
- **コストの確認**: 作成されるリソースとコストを事前確認
- **チームでの確認**: 変更内容をチームで共有・レビュー

## Planの出力例

### 基本的な出力
```bash
make tf-plan TF_ENV=dev

# 出力例
Terraform will perform the following actions:

  # google_cloud_run_v2_service.backend will be created
  + resource "google_cloud_run_v2_service" "backend" {
      + name     = "trip-shiori-dev-backend"
      + location = "asia-northeast1"
      + template {
          + containers {
              + image = "gcr.io/portfolio-472821/trip-shiori-backend:latest"
              + ports {
                  + container_port = 3000
                }
            }
        }
    }

  # google_sql_database_instance.main will be created
  + resource "google_sql_database_instance" "main" {
      + name             = "trip-shiori-dev-db-instance"
      + database_version = "POSTGRES_16"
      + region           = "asia-northeast1"
      + settings {
          + tier = "db-f1-micro"
        }
    }

Plan: 5 to add, 0 to change, 0 to destroy.
```

### 記号の意味
- **`+`**: 新規作成されるリソース
- **`-`**: 削除されるリソース
- **`~`**: 更新されるリソース
- **`-/+`**: 削除後に再作成されるリソース

##  使用方法

### 基本的な使用方法
```bash
# 開発環境の変更内容を確認
make tf-plan TF_ENV=dev

# 本番環境の変更内容を確認
make tf-plan TF_ENV=prod
```

### 詳細な使用方法
```bash
# 特定のリソースのみ確認
terraform plan -target=google_cloud_run_v2_service.backend

# プランをファイルに保存
terraform plan -out=plan.out

# 保存したプランを適用
terraform apply plan.out
```

##  重要なポイント

### 1. 必ず実行する
- **デプロイ前**: 必ずplanを実行して変更内容を確認
- **本番環境**: 特に本番環境では必須
- **チーム作業**: チームで変更内容を共有

### 2. 出力の確認項目
- **作成されるリソース**: 予期しないリソースが作成されないか
- **削除されるリソース**: 重要なリソースが削除されないか
- **コストの影響**: 新規リソースによるコスト増加
- **設定値**: 環境変数や設定値が正しいか

### 3. 問題がある場合の対処
```bash
# 予期しない変更が表示される場合
terraform show                    # 現在の状態を確認
terraform refresh                 # 状態を更新
terraform plan                    # 再度planを実行

# 特定のリソースのみ確認
terraform plan -target=resource_name

# 詳細な出力
terraform plan -detailed-exitcode
```

##  ベストプラクティス

### 1. 段階的な確認
```bash
# 1. プラン実行
make tf-plan TF_ENV=dev

# 2. 変更内容を確認
# 3. 問題なければ適用
make tf-apply TF_ENV=dev
```

### 2. チームでの確認
```bash
# プランをファイルに保存
terraform plan -out=plan.out

# チームで確認後、適用
terraform apply plan.out
```

### 3. CI/CDでの活用
# 自動化での使用例
```
terraform plan -out=plan.out
terraform apply plan.out
```

## よくある問題と解決方法

### 1. 予期しない変更が表示される
原因: 状態ファイルと実際のリソースが異なる
解決: 状態を更新
```
terraform refresh
terraform plan
```

### 2. リソースが削除される

原因: 設定ファイルからリソースが削除された
解決: 設定ファイルを確認・修正

### 3. 設定値が変更される

原因: 環境変数や設定値が変更された
解決: 設定値を確認・修正


## 参考資料

- [Terraform Plan Documentation](https://www.terraform.io/docs/commands/plan.html)
- [Terraform State Management](https://www.terraform.io/docs/state/index.html)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)
