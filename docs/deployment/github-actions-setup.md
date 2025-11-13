# GitHub Actions自動デプロイ設定ガイド

## 概要

GitHub ActionsでGCPに自動デプロイするための設定手順です。

## 前提条件

- GCPプロジェクトが設定済み
- `gcloud` CLIがインストール・認証済み
- GitHubリポジトリへの管理者権限

## 方法1: コンソール（UI）での設定

### Step 1: サービスアカウント作成

1. [Google Cloud Console](https://console.cloud.google.com/) → **IAMと管理** → **サービス アカウント**
2. **「サービス アカウントを作成」** をクリック
3. 以下の情報を入力：
   - **サービスアカウント名**: `github-actions`
   - **説明**: `GitHub Actions用CI/CDサービスアカウント`
4. **「作成して続行」** をクリック

### Step 2: 権限の付与（最小権限の原則）

以下の権限を付与：

- **Cloud Run管理者**: `roles/run.admin`
- **Artifact Registry書き込み**: `roles/artifactregistry.writer`
- **サービスアカウントユーザー**: `roles/iam.serviceAccountUser`

### Step 3: サービスアカウントキーの生成

1. 作成したサービスアカウントをクリック
2. **「鍵」** タブ → **「鍵を追加」** → **「新しい鍵を作成」**
3. **「JSON」** を選択して **「作成」**
4. JSONファイルがダウンロードされます（この1回だけ入手可能）

### Step 4: GitHub Secretsの設定

1. GitHubリポジトリの **Settings** → **Secrets and variables** → **Actions**
2. **「New repository secret」** をクリック
3. 以下の情報を入力：
   - **Name**: `GCP_SA_KEY`
   - **Secret**: ダウンロードしたJSONファイルの内容をそのまま貼り付け
4. **「Add secret」** をクリック

### Step 5: 動作確認

GitHub Actionsの **Actions** タブでデプロイワークフローを実行し、正常に完了することを確認してください。

## 方法2: コマンドラインでの設定

### 自動設定スクリプトの実行（推奨）

```bash
./scripts/setup-gcp-service-account.sh
```

### 手動設定

```bash
# 環境変数の設定
export PROJECT_ID="YOUR_PROJECT_ID"
export SERVICE_ACCOUNT_NAME="github-actions"
export SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# 1. サービスアカウント作成
gcloud iam service-accounts create ${SERVICE_ACCOUNT_NAME} \
    --display-name="GitHub Actions CI/CD" \
    --description="GitHub Actions用CI/CDサービスアカウント" \
    --project=${PROJECT_ID}

# 2. 権限付与
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/iam.serviceAccountUser"

# 3. キー生成
gcloud iam service-accounts keys create ${SERVICE_ACCOUNT_NAME}-key.json \
    --iam-account=${SERVICE_ACCOUNT_EMAIL} \
    --project=${PROJECT_ID}

# 4. GitHub Secretsに設定（JSONファイルの内容をコピー）
cat ${SERVICE_ACCOUNT_NAME}-key.json

# 5. キーファイルの削除（セキュリティ）
rm ${SERVICE_ACCOUNT_NAME}-key.json
```

## 自動デプロイの動作

### トリガー条件
- **本番環境**: `v*` タグへのプッシュ
- **開発環境**: `main` ブランチへのプッシュ
- **手動実行**: GitHub Actions画面から実行可能

### デプロイフロー
1. コードチェックアウト
2. GCP認証
3. Dockerイメージビルド・プッシュ（Frontend + Backend + AI Service）
4. 環境変数設定
5. Terraform適用
6. Cloud Runデプロイ

## トラブルシューティング

### よくあるエラー

| エラー | 解決方法 |
|--------|----------|
| `Error: The caller does not have permission` | サービスアカウントに適切な権限が付与されているか確認 |
| `Error: Permission denied` | 必要な権限（`roles/run.admin`, `roles/artifactregistry.writer`）を追加 |
| `Error: Could not load the default credentials` | GitHub Secretsの`GCP_SA_KEY`が正しく設定されているか確認 |

### ログの確認

```bash
# Cloud Runログ
gcloud logging read "resource.type=cloud_run_revision" \
    --project=YOUR_PROJECT_ID \
    --limit=50

# GitHub Actionsログは GitHubリポジトリの Actions タブで確認
```


## 参考リンク

- [Google Cloud IAM ドキュメント](https://cloud.google.com/iam/docs)
- [GitHub Actions ドキュメント](https://docs.github.com/ja/actions)
- [Terraform GCP プロバイダー](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
