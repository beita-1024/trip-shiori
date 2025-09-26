# GitHub Secrets 設定ガイド

## 概要
GCP+TerraformデプロイをGitHub Actionsで実行するために必要なSecretsの設定方法を説明します。

## 必要なGitHub Secrets

### 1. GCP認証関連
| Secret名 | 説明 | 取得方法 |
|---------|------|----------|
| `GCP_SA_KEY` | GCPサービスアカウントのJSONキー | GCP Console > IAM > サービスアカウント |

### 2. データベース設定
| Secret名 | 説明 | 例 |
|---------|------|-----|
| `DB_PASSWORD_DEV` | 開発環境DBパスワード | `[開発環境用パスワード]` |
| `DB_PASSWORD_PROD` | 本番環境DBパスワード | `[本番環境用パスワード]` |

### 3. JWT設定
| Secret名 | 説明 | 例 |
|---------|------|-----|
| `JWT_SECRET_DEV` | 開発環境JWT秘密鍵 | `[開発環境用JWT秘密鍵]` |
| `JWT_SECRET_PROD` | 本番環境JWT秘密鍵 | `[本番環境用JWT秘密鍵]` |

### 4. SMTP設定
| Secret名 | 説明 | 例 |
|---------|------|-----|
| `SMTP_USER` | SMTPユーザー名 | `[SMTPユーザー名]` |
| `SMTP_PASSWORD` | SMTPパスワード | `[SMTPパスワード]` |

### 5. OpenAI設定
| Secret名 | 説明 | 例 |
|---------|------|-----|
| `OPENAI_API_KEY` | OpenAI APIキー | `[OpenAI APIキー]` |

## 設定手順

### 1. GCPサービスアカウントの作成
```bash
# サービスアカウント作成
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions" \
  --description="GitHub Actions用サービスアカウント"

# 必要な権限を付与
gcloud projects add-iam-policy-binding portfolio-472821 \
  --member="serviceAccount:github-actions@portfolio-472821.iam.gserviceaccount.com" \
  --role="roles/editor"

# JSONキーを生成
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@portfolio-472821.iam.gserviceaccount.com
```

### 2. GitHub Secretsの設定
1. GitHubリポジトリの「Settings」→「Secrets and variables」→「Actions」
2. 「New repository secret」をクリック
3. 上記の表に従って各Secretを設定

### 3. 設定確認
```bash
# ローカルでテスト
make deploy-gcp-dev-auto
make deploy-gcp-prod-auto
```

## セキュリティ注意事項

- **本番環境のSecretsは強力なパスワードを使用**
- **JWT秘密鍵は十分に長く、ランダムな文字列**
- **OpenAI APIキーは使用量制限を設定**
- **SMTPパスワードはアプリパスワードを使用**

## トラブルシューティング

### よくあるエラー
1. **認証エラー**: `GCP_SA_KEY`の形式を確認
2. **権限エラー**: サービスアカウントの権限を確認
3. **リソース作成エラー**: プロジェクトの課金設定を確認

### ログ確認
```bash
# GitHub Actionsのログを確認
# リポジトリの「Actions」タブから実行ログを確認
```
