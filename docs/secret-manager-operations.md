# GCP Secret Manager 運用ガイド

このドキュメントでは、Trip ShioriアプリケーションでGCP Secret Managerの日常的な運用方法を説明します。

## 概要

Secret Managerの運用には以下の操作が含まれます：

- シークレット値の更新
- シークレット値の確認
- シークレットのローテーション
- アクセス権限の管理
- 監査ログの確認

## シークレット値の更新

### 1. 新しいバージョンの追加

```bash
# データベースパスワードの更新
echo -n "new-password" | gcloud secrets versions add trip-shiori-dev-database-password --data-file=-

# JWTシークレットの更新
echo -n "new-jwt-secret" | gcloud secrets versions add trip-shiori-dev-jwt-secret --data-file=-

# APIキーの更新
echo -n "new-api-key" | gcloud secrets versions add trip-shiori-dev-openai-api-key --data-file=-
```

### 2. ファイルから更新

```bash
# 一時ファイルに新しい値を書き込む
echo -n "new-password" > /tmp/new-password.txt

# ファイルから更新
gcloud secrets versions add trip-shiori-dev-database-password --data-file=/tmp/new-password.txt

# 一時ファイルを削除
rm /tmp/new-password.txt
```

### 3. 一括更新スクリプト

```bash
#!/bin/bash
# scripts/update-secrets.sh

ENV=$1  # dev または prod
SECRET_NAME=$2
NEW_VALUE=$3

if [ "$ENV" != "dev" ] && [ "$ENV" != "prod" ]; then
  echo "使用方法: $0 <dev|prod> <secret-name> <new-value>"
  exit 1
fi

SECRET_ID="trip-shiori-$ENV-$SECRET_NAME"

echo "Updating secret: $SECRET_ID"
echo -n "$NEW_VALUE" | gcloud secrets versions add "$SECRET_ID" --data-file=-
echo "✅ Secret updated successfully"
```

**使用例**:
```bash
chmod +x ./scripts/update-secrets.sh
./scripts/update-secrets.sh dev database-password "new-password-here"
./scripts/update-secrets.sh prod openai-api-key "sk-new-api-key-here"
```

## シークレット値の確認

### 1. シークレット一覧表示

```bash
# Dev環境のシークレット一覧
gcloud secrets list --filter="name:trip-shiori-dev-*" --format="table(name,createTime,labels.environment)"

# Prod環境のシークレット一覧
gcloud secrets list --filter="name:trip-shiori-prod-*" --format="table(name,createTime,labels.environment)"
```

### 2. 特定のシークレットの詳細

```bash
# シークレットの詳細情報
gcloud secrets describe trip-shiori-dev-database-password

# バージョン一覧
gcloud secrets versions list trip-shiori-dev-database-password
```

### 3. シークレット値の取得

```bash
# 最新バージョンの値を取得
gcloud secrets versions access latest --secret="trip-shiori-dev-database-password"

# 特定バージョンの値を取得
gcloud secrets versions access 1 --secret="trip-shiori-dev-database-password"
```

### 4. 値の確認（表示のみ）

```bash
# 値を表示（ログに残らないよう注意）
gcloud secrets versions access latest --secret="trip-shiori-dev-database-password" | head -c 10
echo "..."
```

## シークレットのローテーション

### 1. 自動ローテーションの設定

```bash
# データベースパスワードの自動ローテーション（例：30日間隔）
gcloud secrets set-rotation trip-shiori-dev-database-password \
  --rotation-period=30d

# JWTシークレットの自動ローテーション（例：90日間隔）
gcloud secrets set-rotation trip-shiori-dev-jwt-secret \
  --rotation-period=90d
```

### 2. 手動ローテーション

```bash
# 新しいパスワードを生成
NEW_PASSWORD=$(openssl rand -base64 32)

# シークレットを更新
echo -n "$NEW_PASSWORD" | gcloud secrets versions add trip-shiori-dev-database-password --data-file=-

# データベースのパスワードも更新（別途実行）
# 注意: データベースのパスワード変更は慎重に行う
```

### 3. ローテーション設定の確認

```bash
# ローテーション設定の確認
gcloud secrets describe trip-shiori-dev-database-password --format="value(rotation)"

# ローテーション設定の削除
gcloud secrets unset-rotation trip-shiori-dev-database-password
```

## アクセス権限の管理

### 1. 現在の権限確認

```bash
# シークレットのIAMポリシー確認
gcloud secrets get-iam-policy trip-shiori-dev-database-password

# プロジェクト全体のSecret Manager権限確認
gcloud projects get-iam-policy portfolio-472821 --flatten="bindings[].members" --filter="bindings.role:roles/secretmanager*"
```

### 2. 権限の付与

```bash
# 特定ユーザーにSecret Manager Viewer権限を付与
gcloud secrets add-iam-policy-binding trip-shiori-dev-database-password \
  --member="user:developer@example.com" \
  --role="roles/secretmanager.secretAccessor"

# サービスアカウントに権限を付与
gcloud secrets add-iam-policy-binding trip-shiori-dev-database-password \
  --member="serviceAccount:cloud-run-service@portfolio-472821.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. 権限の削除

```bash
# 特定ユーザーの権限を削除
gcloud secrets remove-iam-policy-binding trip-shiori-dev-database-password \
  --member="user:former-developer@example.com" \
  --role="roles/secretmanager.secretAccessor"
```

## 監査ログの確認

### 1. Secret Manager API呼び出しログ

```bash
# 過去24時間のSecret Managerアクセスログ
gcloud logging read "resource.type=secretmanager.googleapis.com/Secret" \
  --limit=50 \
  --format="table(timestamp,protoPayload.methodName,protoPayload.authenticationInfo.principalEmail)"

# 特定のシークレットへのアクセスログ
gcloud logging read "resource.type=secretmanager.googleapis.com/Secret AND resource.labels.secret_id=trip-shiori-dev-database-password" \
  --limit=20 \
  --format="table(timestamp,protoPayload.methodName,protoPayload.authenticationInfo.principalEmail)"
```

### 2. Cloud Runからのアクセスログ

```bash
# Cloud RunサービスからのSecret Managerアクセス
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.message:\"secretmanager\"" \
  --limit=20 \
  --format="table(timestamp,resource.labels.service_name,jsonPayload.message)"
```

## バックアップと復旧

### 1. シークレットのバックアップ

```bash
#!/bin/bash
# scripts/backup-secrets.sh

ENV=$1
BACKUP_DIR="./backups/secrets-$ENV-$(date +%Y%m%d)"

mkdir -p "$BACKUP_DIR"

# シークレット一覧を取得
gcloud secrets list --filter="name:trip-shiori-$ENV-*" --format="value(name)" | while read secret_name; do
  echo "Backing up: $secret_name"
  
  # シークレットの値を取得（暗号化して保存）
  gcloud secrets versions access latest --secret="$secret_name" | \
    gpg --symmetric --cipher-algo AES256 --output "$BACKUP_DIR/${secret_name}.gpg"
done

echo "✅ Secrets backup completed: $BACKUP_DIR"
```

### 2. シークレットの復旧

```bash
#!/bin/bash
# scripts/restore-secrets.sh

ENV=$1
BACKUP_DIR=$2

if [ -z "$ENV" ] || [ -z "$BACKUP_DIR" ]; then
  echo "使用方法: $0 <dev|prod> <backup-directory>"
  exit 1
fi

for encrypted_file in "$BACKUP_DIR"/*.gpg; do
  secret_name=$(basename "$encrypted_file" .gpg)
  
  echo "Restoring: $secret_name"
  
  # 復号化してシークレットを復元
  gpg --decrypt "$encrypted_file" | \
    gcloud secrets versions add "$secret_name" --data-file=-
done

echo "✅ Secrets restore completed"
```

## セキュリティベストプラクティス

### 1. 最小権限の原則

- 必要最小限の権限のみを付与
- 定期的な権限レビューを実施
- 不要になった権限は即座に削除

### 2. ローテーション

- 定期的なシークレットローテーション
- 重要なシークレットは短い間隔でローテーション
- ローテーション計画の文書化

### 3. 監視とアラート

```bash
# 異常なアクセスパターンの監視
gcloud logging read "resource.type=secretmanager.googleapis.com/Secret AND severity>=ERROR" \
  --limit=10 \
  --format="table(timestamp,severity,protoPayload.methodName,protoPayload.authenticationInfo.principalEmail)"
```

### 4. アクセス制限

- 特定のIPアドレスからのアクセスのみ許可
- 時間制限付きアクセス権限
- 多要素認証の強制

## トラブルシューティング

### よくある問題

#### 1. Cloud Runがシークレットにアクセスできない

**症状**: Cloud Runサービスが起動しない、環境変数が空

**確認方法**:
```bash
# Cloud Runサービスのログを確認
gcloud run services logs read trip-shiori-dev-backend --region=asia-northeast1 --limit=50

# シークレットのIAMポリシーを確認
gcloud secrets get-iam-policy trip-shiori-dev-database-password
```

**解決方法**:
```bash
# Cloud Runサービスアカウントに権限を付与
gcloud secrets add-iam-policy-binding trip-shiori-dev-database-password \
  --member="serviceAccount:trip-shiori-dev-backend@portfolio-472821.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

#### 2. シークレットが見つからない

**症状**: `Secret not found` エラー

**確認方法**:
```bash
# シークレットの存在確認
gcloud secrets describe trip-shiori-dev-database-password
```

**解決方法**:
```bash
# シークレットを再作成
echo -n "your-password" | gcloud secrets create trip-shiori-dev-database-password \
  --data-file=- \
  --replication-policy="user-managed" \
  --locations="asia-northeast1"
```

#### 3. 権限不足エラー

**症状**: `Permission denied` エラー

**解決方法**:
```bash
# 必要な権限を確認・付与
gcloud projects add-iam-policy-binding portfolio-472821 \
  --member="user:your-email@example.com" \
  --role="roles/secretmanager.secretAccessor"
```

## 参考リンク

- [GCP Secret Manager ドキュメント](https://cloud.google.com/secret-manager/docs)
- [Secret Manager のベストプラクティス](https://cloud.google.com/secret-manager/docs/best-practices)
- [Cloud Run での Secret Manager 使用](https://cloud.google.com/run/docs/configuring/secrets)
- [Secret Manager の監査ログ](https://cloud.google.com/secret-manager/docs/audit-logging)
