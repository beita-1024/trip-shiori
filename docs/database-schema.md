# Trip Shiori データベーススキーマ

## ER図

```mermaid
erDiagram
    User {
        string id PK "cuid()"
        string email UK "メールアドレス（ユニーク）"
        string passwordHash "パスワードハッシュ"
        string name "表示名（任意）"
        datetime emailVerified "メール認証日時"
        datetime createdAt "作成日時"
        datetime updatedAt "更新日時"
    }

    Itinerary {
        string id PK "VarChar(255)"
        string data "行程データ（JSON形式）"
        datetime createdAt "作成日時"
        datetime updatedAt "更新日時"
        string userId FK "所有者のユーザーID"
    }

    EmailVerificationToken {
        string id PK "cuid()"
        string userId FK "紐付くユーザーID"
        string tokenHash UK "ハッシュ化されたトークン値"
        datetime expiresAt "有効期限"
        datetime createdAt "作成日時"
    }

    User ||--o{ Itinerary : "行程"
    User ||--o{ EmailVerificationToken : "メール認証トークン"
```

## テーブル詳細

### User（ユーザー）
- **目的**: ユーザー情報を管理
- **主キー**: `id` (cuid)
- **ユニーク制約**: `email`
- **リレーション**: 
  - 1対多: `Itinerary` (ユーザーが所有する行程)
  - 1対多: `EmailVerificationToken` (メール認証トークン)

### Itinerary（行程）
- **目的**: 旅行の行程データを管理
- **主キー**: `id` (VarChar(255))（旅程のURLと対応させるためにあえてここだけVarCharにしている。10文字のID）
- **外部キー**: `userId` → `User.id`
- **特徴**: 
  - 行程データはJSON形式で保存（LLM APIとの互換性のため）
  - ユーザー削除時はカスケード削除（親が消えたら消す設定）

### EmailVerificationToken（メール認証トークン）
- **目的**: メール認証用のトークンを管理
- **主キー**: `id` (cuid)
- **外部キー**: `userId` → `User.id`
- **ユニーク制約**: `tokenHash`
- **インデックス**: 
  - `userId` (検索性能向上)
  - `expiresAt` (期限切れトークン削除用)
  - `tokenHash` (トークン検索用)
- **特徴**: ユーザー削除時はカスケード削除

## インデックス

| テーブル | カラム | 目的 |
|---------|--------|------|
| EmailVerificationToken | userId | ユーザー別トークン検索 |
| EmailVerificationToken | expiresAt | 期限切れトークン削除 |
| EmailVerificationToken | tokenHash | トークン検索 |

## セキュリティ考慮事項

1. **パスワード**: Argon2でハッシュ化
2. **認証トークン**: ハッシュ化して保存
3. **カスケード削除**: ユーザー削除時に関連データも削除
4. **有効期限**: 認証トークンに有効期限を設定

## データベース設定

- **プロバイダー**: PostgreSQL
- **接続**: `DATABASE_URL`環境変数で設定
- **タイムゾーン**: Timestamptz(6)でタイムゾーン対応
