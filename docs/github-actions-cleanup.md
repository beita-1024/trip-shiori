# GitHub Actions 履歴削除スクリプト

このドキュメントでは、GitHub Actionsの履歴を削除するスクリプトの使用方法について説明します。

## 概要

`scripts/cleanup-github-actions.sh` スクリプトは、指定した日数より前のGitHub Actionsワークフロー実行履歴を削除します。デフォルトでは2日前までの履歴を削除対象とします。

## 前提条件

- GitHub CLI (`gh`) がインストールされていること
- GitHub CLIが認証されていること
- リポジトリへのアクセス権限があること

## 使用方法

### 1. ドライラン実行（推奨）

まず、削除対象を確認するためにドライランを実行します：

```bash
make cleanup-github-actions-dry-run
```

このコマンドは実際の削除は行わず、削除対象のワークフロー実行の詳細を表示します。

### 2. 実際の削除実行

ドライランの結果を確認した後、実際の削除を実行します：

```bash
make cleanup-github-actions
```

## スクリプトの詳細

### 設定可能な変数

- `REPO_OWNER`: リポジトリのオーナー（デフォルト: `d-beita`）
- `REPO_NAME`: リポジトリ名（デフォルト: `trip-shiori`）
- `DAYS_AGO`: 削除対象の日数（デフォルト: `2`）
- `DRY_RUN`: ドライランモード（デフォルト: `false`）

### 削除対象

- ステータスが `completed` のワークフロー実行
- 指定した日数より前に作成されたワークフロー実行

### 安全機能

- 削除前に確認プロンプトが表示される
- ドライランモードで事前確認が可能
- 削除結果の詳細レポート

## 使用例

### 基本的な使用方法

```bash
# ドライラン実行
make cleanup-github-actions-dry-run

# 実際の削除実行
make cleanup-github-actions
```

### カスタム設定での実行

```bash
# スクリプトを直接実行（カスタム設定）
DAYS_AGO=7 DRY_RUN=true ./scripts/cleanup-github-actions.sh
```

## 注意事項

⚠️ **重要な注意事項**

- 削除されたワークフロー実行は**復元できません**
- 本番環境で使用する前に、必ずドライランを実行してください
- 削除対象のワークフロー実行数が多い場合は、処理に時間がかかる場合があります

## トラブルシューティング

### GitHub CLIが認証されていない場合

```bash
gh auth login
```

### リポジトリアクセス権限がない場合

- リポジトリのオーナーまたは管理者権限が必要です
- 組織のリポジトリの場合は、適切な権限を確認してください

### スクリプトが見つからない場合

```bash
# スクリプトの存在確認
ls -la scripts/cleanup-github-actions.sh

# 実行権限の確認
chmod +x scripts/cleanup-github-actions.sh
```

## ログ出力

スクリプトは以下の色付きログを出力します：

- 🟢 `[INFO]`: 情報メッセージ
- 🟡 `[WARN]`: 警告メッセージ
- 🔴 `[ERROR]`: エラーメッセージ

## 関連コマンド

- `make help`: 利用可能なコマンド一覧を表示
- `make cleanup-github-actions`: 履歴削除実行
- `make cleanup-github-actions-dry-run`: ドライラン実行
