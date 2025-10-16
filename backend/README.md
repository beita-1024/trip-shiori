# Backend Service (Express + TypeScript)

Trip ShioriのバックエンドAPIサービスです。Express + TypeScript + Prismaを使用して、認証、旅程管理、AI機能連携を提供しています。

## 技術スタック

- **Node.js**: JavaScript実行環境
- **Express**: Webアプリケーションフレームワーク
- **TypeScript**: 型安全なJavaScript開発
- **Prisma**: 型安全ORM・データベース管理
- **Zod**: 型安全バリデーション・スキーマ定義
- **JWT**: 認証トークン管理
- **Argon2**: パスワードハッシュ化

## 環境変数

### 必須環境変数

```bash
# データベース接続
DATABASE_URL=postgresql://postgres:postgres@db:5432/app_db
DATABASE_URL_TEST=postgresql://postgres:postgres@db:5432/app_db_test

# サーバー設定
PORT=3000
HOST=0.0.0.0

# JWT認証
JWT_SECRET=your-secure-jwt-secret-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# フロントエンドURL
FRONTEND_URL=http://localhost:3001

# AI機能設定
CEREBRAS_API_KEY=your-cerebras-api-key
OPENAI_API_KEY=your-openai-api-key
TAVILY_API_KEY=your-tavily-api-key
INTERNAL_AI_TOKEN=your-internal-ai-token
INTERNAL_AI_BASE_URL=http://ai:3000
```

### オプション環境変数

```bash
# 環境設定
NODE_ENV=development

# メール送信（SMTP）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=Trip Shiori
SMTP_FROM_EMAIL=noreply@tripshiori.com

# デバッグ
DEBUG=1
```

## 起動方法

### 開発環境

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# または
npm run start:dev
```

### Docker環境

```bash
# Docker Compose経由で起動（推奨）
cd ../
make up

# または直接起動
docker build -t trip-shiori-backend .
docker run -p 3000:3000 --env-file .env trip-shiori-backend
```

## データベース操作

### マイグレーション

```bash
# マイグレーション生成
npx prisma migrate dev --name migration-name

# マイグレーション適用
npx prisma migrate deploy

# データベースリセット
npx prisma migrate reset
```

### Prisma Studio

```bash
# Prisma Studio起動
npx prisma studio

# またはMakefile経由
make db-studio
```

### シードデータ

```bash
# シードデータ投入
npm run seed

# またはMakefile経由
make db-seed
```

## テスト

```bash
# 全テスト実行
npm test

# ウォッチモード
npm run test:watch

# カバレッジ付きテスト
npm run test:coverage

# 特定のテストファイル
npm test -- --testPathPattern=auth.test.ts
```

## API エンドポイント

### 認証

- `POST /auth/register` - ユーザー登録
- `GET /auth/verify-email` - メール認証
- `POST /auth/login` - ログイン
- `POST /auth/logout` - ログアウト
- `POST /auth/password-reset/request` - パスワードリセット要求
- `POST /auth/password-reset/confirm` - パスワードリセット確認

### ユーザー管理

- `GET /api/users/profile` - プロフィール取得
- `PUT /api/users/profile` - プロフィール更新
- `PUT /api/users/password` - パスワード変更
- `POST /api/users/account/delete` - アカウント削除

### 旅程管理

- `GET /api/itineraries` - 旅程一覧取得
- `POST /api/itineraries` - 旅程作成
- `GET /api/itineraries/{id}` - 旅程詳細取得
- `PUT /api/itineraries/{id}` - 旅程更新
- `DELETE /api/itineraries/{id}` - 旅程削除

### 旅程共有

- `POST /api/itineraries/{id}/share` - 共有設定作成
- `GET /api/itineraries/{id}/share` - 共有設定取得
- `PUT /api/itineraries/{id}/share` - 共有設定更新
- `DELETE /api/itineraries/{id}/share` - 共有設定削除

### 公開アクセス

- `GET /shared/{id}` - 共有リンク経由で旅程取得
- `GET /public/{id}` - 公開旅程取得（OGP対応）

### AI機能

- `POST /api/ai/events/complete` - イベント補完
- `POST /api/ai/itinerary-edit` - 旅程編集

## レート制限

### 制限値

- **一般エンドポイント**: 60 req/min
- **パスワードリセット**: 15分あたり3回
- **パスワードリセット確認**: 15分あたり5回
- **AI機能**: 30 req/min

### レート制限ヘッダー

レスポンスに以下のヘッダーが含まれます：

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 2025-01-15T10:30:00Z
```

## AI内部通信

### 構成

```
Express Backend
    ↓ HTTP (X-Internal-Token)
FastAPI AI Service (Port 3000)
    ↓
LangChain 0.3 + LangGraph
    ↓
Cerebras API (優先) / OpenAI API (フォールバック)
```

### 内部通信設定

- **ベースURL**: `INTERNAL_AI_BASE_URL`（デフォルト: `http://ai:3000`）
- **認証**: `X-Internal-Token`ヘッダ
- **タイムアウト**: 30秒
- **リトライ**: 自動リトライ機能付き

### エラーハンドリング

- **503 Service Unavailable**: AIサービスが利用できない場合
- **422 Unprocessable Entity**: AI生成エラーの場合
- **フォールバック**: AIサービス障害時はダミーレスポンスを返す

## バリデーション

### Zodスキーマ

すべてのリクエストはZodスキーマでバリデーションされます：

- **リクエストボディ**: 型安全な検証
- **クエリパラメータ**: 型変換と検証
- **パスパラメータ**: 形式検証

### エラーレスポンス

```json
{
  "error": "invalid_body",
  "message": "Request validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## セキュリティ

### 認証・認可

- **JWT認証**: Access/Refreshトークン方式
- **Cookie認証**: HttpOnly Cookieでトークン管理
- **パスワードハッシュ**: Argon2による安全なハッシュ化
- **CSRF保護**: SameSite Cookie設定

### 入力検証

- **Zodバリデーション**: 全入力の型安全検証
- **SQLインジェクション対策**: Prisma ORM使用
- **XSS対策**: Helmetミドルウェア

### レート制限

- **IPベース制限**: メモリベースのレート制限
- **エンドポイント別制限**: 機能に応じた制限値設定

## 開発

### コード品質

```bash
# リント
npm run lint

# フォーマット
npm run format

# 型チェック
npm run type-check
```

### デバッグ

```bash
# デバッグモード起動
DEBUG=1 npm run dev

# ログレベル設定
LOG_LEVEL=debug npm run dev
```

## トラブルシューティング

### よくある問題

1. **データベース接続エラー**
   - `DATABASE_URL`が正しく設定されているか確認
   - データベースサーバーが起動しているか確認

2. **JWT認証エラー**
   - `JWT_SECRET`が32バイト以上の強力な値か確認
   - トークンの有効期限を確認

3. **AI機能エラー**
   - `INTERNAL_AI_TOKEN`が設定されているか確認
   - AIサービス（FastAPI）が起動しているか確認
   - `CEREBRAS_API_KEY`または`OPENAI_API_KEY`が設定されているか確認

4. **CORSエラー**
   - `FRONTEND_URL`が正しく設定されているか確認
   - フロントエンドのURLと一致しているか確認

### ログ確認

```bash
# Docker Compose環境
make logs-backend

# 直接起動時
# ログは標準出力に出力されます
```

## API仕様書

詳細なAPI仕様は以下を参照してください：

- [OpenAPI仕様書](../docs/api/openapi.yaml)
- [Swagger UI](http://localhost:4002/api-docs)（開発環境）

## 参考資料

- [Express Documentation](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Zod Documentation](https://zod.dev/)
- [JWT Documentation](https://jwt.io/)
