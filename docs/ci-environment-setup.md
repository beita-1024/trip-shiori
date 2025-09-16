# CI環境変数設定ガイド

このドキュメントでは、GitHub ActionsでのCI/CD実行時に必要な環境変数の設定方法について説明します。

## 概要

CI/CDパイプラインでは、以下の2つの方法で環境変数を管理しています：

1. **GitHub Secrets**: 機密情報（APIキー、パスワードなど）
2. **テンプレートファイル**: 非機密の環境変数（URL、環境名など）

## GitHub Secrets設定手順

### 1. リポジトリのSettingsにアクセス

1. GitHubリポジトリのページで「Settings」タブをクリック
2. 左サイドバーの「Secrets and variables」→「Actions」をクリック

### 2. 必要なSecretsを追加

**注意**: CI環境では`JWT_SECRET`と`DATABASE_PASSWORD`などは固定値を使用するため、GitHub Secretsに設定する必要はありません。

以下のSecretsを「New repository secret」ボタンから追加してください：

| Secret名 | 説明 | 例 |
|---------|------|-----|
| `OPENAI_API_KEY` | OpenAI APIキー（AI機能用） | `sk-...` |

### 3. Secretの追加方法

1. 「New repository secret」をクリック
2. 「Name」フィールドにSecret名を入力（例：`OPENAI_API_KEY`）
3. 「Secret」フィールドに値を入力
4. 「Add secret」をクリック

## トラブルシューティング

### よくある問題

1. **Secretが見つからない**
   - GitHub Secretsが正しく設定されているか確認
   - Secret名の大文字小文字が一致しているか確認

2. **環境変数が設定されない**
   - テンプレートファイルが正しく配置されているか確認
   - `envsubst`コマンドが正常に実行されているか確認

3. **テストが失敗する**
   - 必要な環境変数がすべてテンプレートファイルに含まれているか確認
   - データベース接続情報が正しいか確認

4. **working-directoryエラー**
   - パスが正しく指定されているか確認
   - `${{ github.workspace }}`が正しく展開されているか確認

## 参考リンク

- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Actions Environment Variables](https://docs.github.com/en/actions/learn-github-actions/environment-variables)
- [GitHub Actions working-directory](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsrun)
