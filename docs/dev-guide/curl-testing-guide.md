# curl による API テスト & データベース確認ガイド

このガイドでは、APIエンドポイントの動作確認をcurlで行いながら、データベースの状態を確認する汎用的な手順を説明します。

## 1. 前提条件

- Docker & Docker Compose がインストールされている
- プロジェクトのルートディレクトリにいる
- 必要な環境変数が設定されている


## 2. データベースの確認方法

### 方法1: Prisma Studio（推奨）

```bash
# バックエンドコンテナのシェルに入る
make sh-backend

# コンテナ内でPrisma Studioを起動
npx prisma studio
```

ブラウザで `http://localhost:5555` にアクセスしてGUIでデータベースを確認できます。

### 方法2: PostgreSQL 直接接続

```bash
# PostgreSQLに直接接続
docker compose exec db psql -U postgres -d postgres

# 接続を終了
\q
```

## 3. 基本的なcurlコマンド

### 基本的な構文

```bash
# GET リクエスト
curl -X GET http://localhost:4002/api/endpoint

# POST リクエスト（JSON）
curl -X POST http://localhost:4002/api/endpoint \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'

# PUT リクエスト
curl -X PUT http://localhost:4002/api/endpoint/123 \
  -H "Content-Type: application/json" \
  -d '{"key": "updated_value"}'

# DELETE リクエスト
curl -X DELETE http://localhost:4002/api/endpoint/123

# ヘッダー付きリクエスト
curl -X GET http://localhost:4002/api/endpoint \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json"
```

### レスポンスの詳細表示

```bash
# レスポンスヘッダーも表示
curl -i http://localhost:4002/api/endpoint

# 詳細な情報を表示
curl -v http://localhost:4002/api/endpoint

# レスポンスのみ表示（エラーも含む）
curl -s http://localhost:4002/api/endpoint
```

## 4. 利用可能なエンドポイント

### ヘルスチェック

```bash
curl http://localhost:4002/health
```

### 旅のしおり関連

```bash
# 全しおり取得
curl http://localhost:4002/api/itineraries

# 特定のしおり取得
curl http://localhost:4002/api/itineraries/ITINERARY_ID

# しおり作成
curl -X POST http://localhost:4002/api/itineraries \
  -H "Content-Type: application/json" \
  -d '{
    "title": "東京旅行",
    "start_date": "2025-09-01",
    "end_date": "2025-09-03"
  }'
```

### 認証関連

```bash
# ユーザー登録
curl -X POST http://localhost:4002/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "name": "テストユーザー"
  }'

# メール認証
curl "http://localhost:4002/auth/verify-email?uid=USER_ID&token=TOKEN"
```

### イベント関連

```bash
# イベント一覧取得
curl http://localhost:4002/api/events

# イベント作成
curl -X POST http://localhost:4002/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "イベント名",
    "description": "イベント説明"
  }'
```

## 5. データベース確認の基本

### テーブル一覧確認

```bash
# 全テーブル一覧
docker compose exec db psql -U postgres -d postgres -c "\dt"

# テーブル構造確認
docker compose exec db psql -U postgres -d postgres -c "\d table_name"
```

### 基本的なSELECT文

```bash
# 全レコード取得
docker compose exec db psql -U postgres -d postgres -c "SELECT * FROM \"TableName\";"

# 条件付き検索
docker compose exec db psql -U postgres -d postgres -c "SELECT * FROM \"TableName\" WHERE column = 'value';"

# 件数確認
docker compose exec db psql -U postgres -d postgres -c "SELECT COUNT(*) FROM \"TableName\";"

# 最新レコード確認
docker compose exec db psql -U postgres -d postgres -c "SELECT * FROM \"TableName\" ORDER BY \"createdAt\" DESC LIMIT 5;"
```

## 6. プロジェクト固有のテーブル確認

### ユーザーテーブル

```bash
# 全ユーザー確認
docker compose exec db psql -U postgres -d postgres -c "SELECT id, email, name, \"emailVerified\", \"createdAt\" FROM \"User\";"

# 認証済みユーザーのみ
docker compose exec db psql -U postgres -d postgres -c "SELECT * FROM \"User\" WHERE \"emailVerified\" IS NOT NULL;"
```

### 旅のしおりテーブル

```bash
# 全しおり確認
docker compose exec db psql -U postgres -d postgres -c "SELECT id, \"createdAt\", \"updatedAt\" FROM \"Itinerary\";"

# 最新のしおり
docker compose exec db psql -U postgres -d postgres -c "SELECT id, \"createdAt\" FROM \"Itinerary\" ORDER BY \"createdAt\" DESC LIMIT 1;"
```

### 認証トークンテーブル

```bash
# 有効な認証トークン
docker compose exec db psql -U postgres -d postgres -c "SELECT id, \"userId\", \"expiresAt\" FROM \"EmailVerificationToken\" WHERE \"expiresAt\" > NOW();"

# 期限切れトークン
docker compose exec db psql -U postgres -d postgres -c "SELECT id, \"userId\", \"expiresAt\" FROM \"EmailVerificationToken\" WHERE \"expiresAt\" < NOW();"
```

## 7. 便利なコマンド集

### 開発用コマンド

```bash
# ログを確認
make logs

# バックエンドのシェルに入る
make sh-backend

# フロントエンドのシェルに入る
make sh-frontend

# データベースマイグレーション
make db-migrate

# サービス停止
make down

# サービス再起動
make down && make up
```

### データベース操作

```bash
# データベースリセット（開発時）
make sh-backend
# コンテナ内で
npx prisma migrate reset

# マイグレーション実行
npx prisma migrate dev

# スキーマの確認
npx prisma db pull

# データベースの状態確認
npx prisma db status
```

## 8. デバッグ用の便利なクエリ

### テーブル結合クエリ

```sql
-- ユーザーとそのしおり
SELECT 
  u.email,
  u.name,
  i.id as itinerary_id,
  i."createdAt" as itinerary_created
FROM "User" u
LEFT JOIN "Itinerary" i ON u.id = i."userId"
ORDER BY u."createdAt" DESC;

-- ユーザーと認証状態
SELECT 
  u.id,
  u.email,
  u.name,
  u."emailVerified",
  u."createdAt",
  COUNT(t.id) as active_tokens
FROM "User" u
LEFT JOIN "EmailVerificationToken" t ON u.id = t."userId" 
  AND t."expiresAt" > NOW()
GROUP BY u.id, u.email, u.name, u."emailVerified", u."createdAt";
```

### 統計クエリ

```sql
-- 日別ユーザー登録数
SELECT 
  DATE("createdAt") as date,
  COUNT(*) as user_count
FROM "User"
GROUP BY DATE("createdAt")
ORDER BY date DESC;

-- テーブルサイズ確認
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```


## 9. トラブルシューティング

### よくある問題

1. **サーバーが起動しない**
   ```bash
   # ログを確認
   make logs
   
   # ポートが使用中でないか確認
   lsof -i :4002
   ```

2. **データベース接続エラー**
   ```bash
   # データベースコンテナの状態確認
   docker compose ps db
   
   # データベースログ確認
   docker compose logs db
   ```

3. **API レスポンスエラー**
   ```bash
   # 詳細なレスポンスを確認
   curl -v http://localhost:4002/api/endpoint
   
   # エラーログを確認
   make logs
   ```
