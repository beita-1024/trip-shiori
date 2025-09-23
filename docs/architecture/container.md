# コンテナ図

## 概要

Trip Shioriのコンテナ図（C4 Level 2）です。システム内部の各コンテナの役割と相互関係、技術スタック、通信プロトコルを示しています。

## コンテナ図

```mermaid
graph TD
    %% ユーザー
    User[旅行者<br/>ユーザー]
    
    %% フロントエンド
    subgraph "フロントエンド"
        WebApp[Next.js Web App<br/><br/>• React + TypeScript<br/>• TailwindCSS<br/>• Server Components<br/>• Client Components<br/><br/>旅程作成・編集UI<br/>AI機能利用UI]
    end
    
    %% バックエンド
    subgraph "バックエンド"
        API[Express.js API Server<br/><br/>• RESTful API<br/>• JWT認証<br/>• レート制限<br/>• バリデーション<br/><br/>認証・旅程管理<br/>AI機能統合]
        
        Prisma[Prisma ORM<br/><br/>• データベース抽象化<br/>• マイグレーション<br/>• 型安全なクエリ<br/><br/>データアクセス層]
        
        Services[AI Services<br/><br/>• ChatGptClient<br/>• JsonCompleter<br/>• イベント補完<br/>• 旅程編集<br/><br/>AI機能提供]
    end
    
    %% データストレージ
    subgraph "データストレージ"
        Database[(PostgreSQL<br/>データベース<br/><br/>• ユーザー情報<br/>• 旅程データ<br/>• 認証トークン<br/><br/>永続化ストレージ)]
    end
    
    %% 外部システム
    subgraph "外部システム"
        OpenAI[OpenAI ChatGPT API<br/><br/>• GPT-4o Mini<br/>• GPT-4<br/>• GPT-3.5 Turbo<br/><br/>AI機能提供]
        
        EmailProvider[メールサービス<br/><br/>• SMTP<br/>• 認証メール<br/>• パスワードリセット<br/><br/>通知・認証]
    end
    
    %% ユーザーとフロントエンドの関係
    User -->|HTTPS<br/>旅程作成・編集<br/>AI機能利用| WebApp
    
    %% フロントエンドとバックエンドの関係
    WebApp -->|HTTPS/REST API<br/>認証・データ取得<br/>AI機能リクエスト| API
    
    %% バックエンド内部の関係
    API -->|データアクセス<br/>CRUD操作| Prisma
    API -->|AI機能呼び出し<br/>イベント補完・旅程編集| Services
    
    %% データアクセス
    Prisma -->|SQL<br/>データ永続化・取得| Database
    
    %% 外部システム連携
    Services -->|HTTPS API<br/>AI機能リクエスト<br/>JSON形式| OpenAI
    API -->|SMTP<br/>認証メール送信<br/>パスワードリセット| EmailProvider
    
    %% スタイル定義
    classDef user fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef frontend fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef backend fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef database fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef external fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    
    %% スタイル適用
    class User user
    class WebApp frontend
    class API,Prisma,Services backend
    class Database database
    class OpenAI,EmailProvider external
```

## 主要なコンテナ構成

### フロントエンド
- **Next.js Web App**: React + TypeScript + TailwindCSS
  - Server Components / Client Components
  - 旅程作成・編集UI、AI機能利用UI

### バックエンド
- **Express.js API Server**: RESTful API、JWT認証、レート制限、バリデーション
- **Prisma ORM**: データベース抽象化、マイグレーション、型安全なクエリ
- **AI Services**: ChatGptClient、JsonCompleter、イベント補完・旅程編集機能

### データストレージ
- **PostgreSQL**: ユーザー情報、旅程データ、認証トークンの永続化

### 外部システム
- **OpenAI ChatGPT API**: GPT-4o Mini、GPT-4、GPT-3.5 TurboによるAI機能提供
- **メールサービス**: SMTP、認証メール、パスワードリセット

## 主要な通信関係

- **ユーザー ↔ フロントエンド**: HTTPS経由で旅程作成・編集、AI機能利用
- **フロントエンド ↔ バックエンド**: HTTPS/REST API経由で認証・データ取得、AI機能リクエスト
- **バックエンド内部**: API → Prisma（データアクセス）、API → AI Services（AI機能呼び出し）
- **データアクセス**: Prisma → PostgreSQL（SQL経由でデータ永続化・取得）
- **外部連携**: AI Services → OpenAI（HTTPS API）、API → メールサービス（SMTP）

## 技術スタック

### フロントエンド
- **Next.js**: React フレームワーク
- **TypeScript**: 型安全な開発
- **TailwindCSS**: スタイリング
- **Server Components**: サーバーサイドレンダリング
- **Client Components**: クライアントサイドインタラクション

### バックエンド
- **Express.js**: Node.js Webフレームワーク
- **Prisma**: データベースORM
- **JWT**: 認証トークン
- **OpenAI API**: AI機能統合

### データベース
- **PostgreSQL**: リレーショナルデータベース
- **Prisma Migrate**: データベースマイグレーション

### 外部サービス
- **OpenAI ChatGPT API**: AI機能提供
- **SMTP**: メール送信
