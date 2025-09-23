# GitHub Actions自動デプロイ設定ガイド

## 概要

GitHub ActionsでGCPに自動デプロイするための設定手順です。
コンソール（UI）での設定方法と、コマンドラインでの設定方法の両方を説明します。

## 方法1: コンソール（UI）での設定（推奨・簡単）

### Step 1: Google Cloud Consoleにアクセス

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクト `portfolio-472821` が選択されていることを確認
3. 左側メニューから **「IAMと管理」** → **「サービス アカウント」** をクリック

### Step 2: サービスアカウント作成

1. **「サービス アカウントを作成」** ボタンをクリック
2. 以下の情報を入力：
   - **サービスアカウント名**: `ci-deployer`
   - **サービスアカウントID**: `ci-deployer@portfolio-472821.iam.gserviceaccount.com`（自動生成）
   - **説明**: `GitHub Actions用CI/CDサービスアカウント`

3. **「作成して続行」** をクリック

### Step 3: 権限の付与（最小権限の原則）

以下の権限を順次付与します：

#### 必須権限
- **Cloud Run管理者**: `roles/run.admin`
  - Cloud Runサービスの作成・更新・削除
- **Artifact Registry書き込み**: `roles/artifactregistry.writer`
  - Dockerイメージのプッシュ
- **サービスアカウントユーザー**: `roles/iam.serviceAccountUser`
  - Cloud Runサービスアカウントの使用

#### オプション権限（必要に応じて）
- **Secret Manager読み取り**: `roles/secretmanager.secretVersionAccessor`
  - シークレットの読み取り
- **Cloud SQL管理者**: `roles/cloudsql.admin`
  - データベースの管理
- **Storage管理者**: `roles/storage.objectAdmin`
  - Terraform状態ファイルの管理

### Step 4: サービスアカウントキーの生成

1. 作成したサービスアカウント `ci-deployer@portfolio-472821.iam.gserviceaccount.com` をクリック
2. **「鍵」** タブをクリック
3. **「鍵を追加」** → **「新しい鍵を作成」** をクリック
4. **「JSON」** を選択して **「作成」** をクリック
5. **JSONファイルがダウンロードされます**（この1回だけ入手可能）

### Step 5: GitHub Secretsの設定

1. GitHubリポジトリの **Settings** → **Secrets and variables** → **Actions** に移動
2. **「New repository secret」** をクリック
3. 以下の情報を入力：
   - **Name**: `GCP_SA_KEY`
   - **Secret**: ダウンロードしたJSONファイルの内容をそのまま貼り付け
4. **「Add secret」** をクリック

### Step 6: 動作確認

```bash
# ローカルで自動デプロイをテスト
make deploy-gcp-prod-auto
```

## 方法2: コマンドラインでの設定

### 自動設定スクリプトの実行

```bash
# サービスアカウント作成とキー生成
./scripts/setup-github-actions.sh
```

### 手動設定

```bash
# 1. サービスアカウント作成
gcloud iam service-accounts create ci-deployer \
    --display-name="GitHub Actions CI/CD" \
    --description="GitHub Actions用CI/CDサービスアカウント" \
    --project=portfolio-472821

# 2. 権限付与
gcloud projects add-iam-policy-binding portfolio-472821 \
    --member="serviceAccount:ci-deployer@portfolio-472821.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding portfolio-472821 \
    --member="serviceAccount:ci-deployer@portfolio-472821.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding portfolio-472821 \
    --member="serviceAccount:ci-deployer@portfolio-472821.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"

# 3. キー生成
gcloud iam service-accounts keys create ci-deployer-key.json \
    --iam-account=ci-deployer@portfolio-472821.iam.gserviceaccount.com \
    --project=portfolio-472821

# 4. Base64エンコード
base64 -i ci-deployer-key.json
```

## 自動デプロイの動作

### トリガー条件
- **本番環境**: `main`ブランチへのプッシュ
- **開発環境**: `develop`ブランチへのプッシュ
- **手動実行**: GitHub Actions画面から実行可能

### デプロイフロー
1. コードチェックアウト
2. GCP認証
3. Dockerイメージビルド・プッシュ
4. Terraform適用（自動承認）
5. デプロイ結果検証

## トラブルシューティング

### よくあるエラー

#### 認証エラー
```
Error: The caller does not have permission
```
**解決方法**: サービスアカウントに適切な権限が付与されているか確認

#### 権限不足エラー
```
Error: Permission denied
```
**解決方法**: 必要な権限を追加で付与

#### キーが見つからないエラー
```
Error: Could not load the default credentials
```
**解決方法**: GitHub Secretsの`GCP_SA_KEY`が正しく設定されているか確認

### ログの確認

```bash
# Cloud Runログ
gcloud logging read "resource.type=cloud_run_revision" \
    --project=portfolio-472821 \
    --limit=50

# GitHub Actionsログ
# GitHubリポジトリの Actions タブで確認
```

## セキュリティのベストプラクティス

### 1. 最小権限の原則
- 必要最小限の権限のみ付与
- 定期的な権限の見直し

### 2. キーの管理
- JSONキーファイルは絶対にGitにコミットしない
- 定期的なキーのローテーション
- 不要になったキーは削除

### 3. 監査ログ
- サービスアカウントの使用状況を監視
- 異常なアクセスパターンの検出

## 参考リンク

- [Google Cloud IAM ドキュメント](https://cloud.google.com/iam/docs)
- [GitHub Actions ドキュメント](https://docs.github.com/ja/actions)
- [Terraform GCP プロバイダー](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
