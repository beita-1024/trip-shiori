# GCPプロジェクト権限設定状況

## 概要
現在のGCPプロジェクト `portfolio-472821` の権限設定状況と、GitHub Actions用サービスアカウントの作成手順をまとめています。

## プロジェクト情報
- **プロジェクトID**: `portfolio-472821`
- **プロジェクト名**: `Portfolio`
- **プロジェクト番号**: `377905553909`
- **状態**: `ACTIVE`
- **作成日時**: `2025-09-21T21:14:35.888149Z`

## 現在の権限設定

### 1. ユーザー権限
| ロール | メンバー | 説明 |
|--------|----------|------|
| `roles/owner` | `beita.dev.services@gmail.com` | プロジェクトの完全な管理権限 |

### 2. サービスアカウント権限
| ロール | メンバー | 説明 |
|--------|----------|------|
| `roles/editor` | `377905553909-compute@developer.gserviceaccount.com` | デフォルトのCompute Engineサービスアカウント |

### 3. システムサービスアカウント
| サービス | アカウント | ロール |
|----------|------------|--------|
| **Cloud Build** | `377905553909@cloudbuild.gserviceaccount.com` | `roles/cloudbuild.builds.builder` |
| **Cloud Run** | `service-377905553909@serverless-robot-prod.iam.gserviceaccount.com` | `roles/run.serviceAgent` |
| **Compute Engine** | `service-377905553909@compute-system.iam.gserviceaccount.com` | `roles/compute.serviceAgent` |
| **Container Registry** | `service-377905553909@containerregistry.iam.gserviceaccount.com` | `roles/containerregistry.ServiceAgent` |
| **Artifact Registry** | `service-377905553909@gcp-sa-artifactregistry.iam.gserviceaccount.com` | `roles/artifactregistry.serviceAgent` |
| **Pub/Sub** | `service-377905553909@gcp-sa-pubsub.iam.gserviceaccount.com` | `roles/pubsub.serviceAgent` |
| **Service Networking** | `service-377905553909@service-networking.iam.gserviceaccount.com` | `roles/servicenetworking.serviceAgent` |
| **VPC Access** | `service-377905553909@gcp-sa-vpcaccess.iam.gserviceaccount.com` | `roles/vpcaccess.serviceAgent` |

## 現在の状況分析

### ✅ 設定済み項目
- **プロジェクトは有効**: `portfolio-472821` はアクティブ
- **基本権限は設定済み**: システムサービスアカウントが適切に設定
- **Compute Engine**: デフォルトサービスアカウントがEditor権限で設定済み

### ❌ 未設定項目
- **GitHub Actions用サービスアカウント**: 新規作成が必要
- **GitHub Secrets**: サービスアカウント作成後に設定が必要

## GitHub Actions用サービスアカウント作成手順

### 1. サービスアカウント作成
```bash
# サービスアカウント作成
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions" \
  --description="GitHub Actions用サービスアカウント"
```

### 2. 必要な権限を付与
```bash
# Editor権限（Cloud Run、Cloud SQL、その他GCPリソースの管理）
gcloud projects add-iam-policy-binding portfolio-472821 \
  --member="serviceAccount:github-actions@portfolio-472821.iam.gserviceaccount.com" \
  --role="roles/editor"

# Service Account User権限（サービスアカウントの使用）
gcloud projects add-iam-policy-binding portfolio-472821 \
  --member="serviceAccount:github-actions@portfolio-472821.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Storage Admin権限（Terraform状態ファイル管理用）
gcloud projects add-iam-policy-binding portfolio-472821 \
  --member="serviceAccount:github-actions@portfolio-472821.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
```

### 3. JSONキー生成
```bash
# JSONキーを生成
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@portfolio-472821.iam.gserviceaccount.com

# 生成されたJSONキーの内容を確認
cat github-actions-key.json
```

### 4. GitHub Secretsに設定
1. GitHubリポジトリの「Settings」→「Secrets and variables」→「Actions」
2. 「New repository secret」をクリック
3. **Name**: `GCP_SA_KEY`
4. **Secret**: 生成されたJSONファイルの内容をコピー&ペースト
5. 「Add secret」をクリック

## 必要な権限の詳細

### 基本権限
- **Editor**: Cloud Run、Cloud SQL、その他GCPリソースの作成・更新・削除
- **Service Account User**: サービスアカウントの使用
- **Storage Admin**: Terraformの状態ファイル管理用

### 具体的な権限内容
| 権限 | 用途 | 必要な理由 |
|------|------|------------|
| `roles/editor` | リソース管理 | Cloud Run、Cloud SQL、その他GCPリソースの作成・更新・削除 |
| `roles/iam.serviceAccountUser` | サービスアカウント使用 | 他のサービスアカウントの使用権限 |
| `roles/storage.admin` | ストレージ管理 | Terraformの状態ファイル管理用 |

## 権限確認コマンド

### 現在の権限確認
```bash
# プロジェクトの全権限確認
gcloud projects get-iam-policy portfolio-472821 \
  --format="table(bindings.role,bindings.members)" \
  --flatten="bindings[].members"

# サービスアカウント一覧確認
gcloud iam service-accounts list --project=portfolio-472821
```

### 作成後の権限確認
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

1. **サービスアカウント作成**: 上記のコマンドを実行
2. **GitHub Secrets設定**: 生成されたJSONキーを設定
3. **ワークフローテスト**: 手動実行でテスト
4. **デプロイメント確認**: 実際のデプロイを実行

## 参考資料

- [GCP IAM公式ドキュメント](https://cloud.google.com/iam/docs)
- [GitHub Actions公式ドキュメント](https://docs.github.com/ja/actions)
- [Terraform公式ドキュメント](https://www.terraform.io/docs)
