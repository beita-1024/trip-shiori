# Trip Shiori API ドキュメント

このディレクトリには、Trip Shiori APIの公式ドキュメントが含まれています。

## ファイル構成

- `openapi.yaml` - OpenAPI 3.0.3仕様書（メインのAPI仕様）
- `openapi.json` - JSON形式のAPI仕様書（Swagger UI用）
- `README.md` - このファイル（API使用方法の説明）

## API仕様書の確認方法

### 1. Makefileコマンド（推奨）
```bash
# Swagger UI起動（Docker使用）
make swagger-ui

# Swagger UI停止
make swagger-ui-stop

# ローカルでSwagger UI起動（JSON変換）
make swagger-ui-local
```

### 2. 手動での起動
```bash
# Dockerを使用してSwagger UIを起動
docker run -d -p 8081:8080 -v $(pwd)/docs/api:/usr/share/nginx/html/api -e SWAGGER_JSON=/usr/share/nginx/html/api/openapi.yaml swaggerapi/swagger-ui

# ブラウザで http://localhost:8081 にアクセス
```

### 3. オンラインツールでの確認
- [Swagger Editor](https://editor.swagger.io/) に `openapi.yaml` の内容をコピー&ペースト

### 4. VS Code拡張機能
- "OpenAPI (Swagger) Editor" 拡張機能をインストールして `openapi.yaml` を開く

## API概要

### 認証
- JWT認証（HttpOnly Cookie）
- メール認証が必要
- パスワードリセット機能

### 主要機能
- **旅のしおり管理**: 作成・取得・編集
- **AI機能**: イベント補完・旅程編集
- **ユーザー管理**: 登録・認証・パスワードリセット

### エンドポイント一覧

#### システム
- `GET /health` - ヘルスチェック

#### 認証
- `POST /auth/register` - ユーザー登録
- `GET /auth/verify-email` - メール認証
- `POST /auth/login` - ログイン
- `POST /auth/logout` - ログアウト
- `GET /auth/protected` - 認証テスト
- `POST /auth/password-reset/request` - パスワードリセットリクエスト
- `POST /auth/password-reset/confirm` - パスワードリセット確認

#### 旅のしおり
- `POST /api/itineraries` - 旅のしおり作成
- `GET /api/itineraries` - 全旅のしおり取得
- `GET /api/itineraries/{id}` - 特定の旅のしおり取得

#### AI機能
- `POST /api/events/complete` - イベント補完
- `POST /api/itinerary-edit` - 旅程編集

## 開発者向け情報

### API仕様書の更新
新しいエンドポイントを追加した際は、必ず `openapi.yaml` を更新してください。

詳細は `.cursor/rules/12-api-documentation-rule.mdc` を参照。

### テスト方法
```bash
# 開発環境でのAPIテスト
curl -X GET http://localhost:3000/health

# 認証が必要なエンドポイントのテスト
curl -X GET http://localhost:3000/auth/protected \
  -H "Cookie: access_token=<JWT_TOKEN>"
```

### エラーレスポンス
APIは統一されたエラーレスポンス形式を使用します：

```json
{
  "error": "error_code",
  "message": "Human readable error message"
}
```

### レート制限
- パスワードリセット: 15分あたり3回
- パスワードリセット確認: 15分あたり5回

## トラブルシューティング

### Swagger UIが起動しない場合
1. Dockerが起動していることを確認
2. ポート8081が使用されていないことを確認
3. YAMLファイルの構文エラーがないことを確認

### YAML構文エラーの場合
```bash
# YAML構文をチェック
npx js-yaml docs/api/openapi.yaml
```

### Makefileコマンドが動作しない場合
```bash
# 利用可能なコマンドを確認
make help

# Swagger UI関連のコマンドを確認
make help | grep swagger
```

## 更新履歴

- 2025-01-15: 初版作成
- 2025-01-15: Swagger UI起動方法を更新
- 2025-01-15: Makefileコマンドを追加
