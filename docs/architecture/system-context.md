# システムコンテキスト図

## 概要

Trip Shioriのシステムコンテキスト図（C4 Level 1）です。システムの全体像と外部システムとの関係性を示しています。

## システムコンテキスト図

```mermaid
graph TD
    %% ユーザー（アクター）
    User[旅行者<br/>ユーザー]
    Admin[管理者<br/>システム管理者]
    
    %% メインシステム
    TripShiori[Trip Shiori<br/>旅行のしおり作成・管理システム<br/><br/>• 旅程作成・編集<br/>• AI機能（イベント補完・旅程編集）<br/>• ユーザー認証・管理<br/>• 旅のしおり共有]
    
    %% 外部システム
    OpenAI[OpenAI ChatGPT API<br/><br/>• GPT-4o Mini<br/>• GPT-4<br/>• GPT-3.5 Turbo<br/><br/>AI機能提供]
    
    EmailService[メールサービス<br/><br/>• 認証メール送信<br/>• パスワードリセット<br/><br/>通知・認証]
    
    %% データストレージ
    Database[(PostgreSQL<br/>データベース<br/><br/>• ユーザー情報<br/>• 旅程データ<br/>• 認証トークン)]
    
    %% インフラ・デプロイ
    CapRover[CapRover<br/>デプロイメント<br/><br/>• アプリケーション配信<br/>• サーバー管理]
    
    GitHub[GitHub<br/>バージョン管理<br/><br/>• ソースコード管理<br/>• CI/CD パイプライン]
    
    %% ユーザーとシステムの関係
    User -->|旅程作成・編集<br/>AI機能利用| TripShiori
    Admin -->|システム管理<br/>監視・保守| TripShiori
    
    %% システムと外部サービスの関係
    TripShiori -->|AI機能リクエスト<br/>イベント補完・旅程編集| OpenAI
    TripShiori -->|認証メール送信<br/>パスワードリセット| EmailService
    TripShiori -->|データ保存・取得<br/>ユーザー・旅程管理| Database
    
    %% インフラ関係
    GitHub -->|CI/CD<br/>自動デプロイ| CapRover
    CapRover -->|アプリケーション配信| TripShiori
    
    %% スタイル定義
    classDef user fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef system fill:#f3e5f5,stroke:#4a148c,stroke-width:3px
    classDef external fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef database fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef infra fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    
    %% スタイル適用
    class User,Admin user
    class TripShiori system
    class OpenAI,EmailService external
    class Database database
    class CapRover,GitHub infra
```

## 主要な構成要素

### ユーザー（アクター）
- **旅行者ユーザー**: 旅程作成・編集、AI機能利用
- **管理者**: システム管理、監視・保守

### メインシステム
- **Trip Shiori**: 旅行のしおり作成・管理システム
  - 旅程作成・編集
  - AI機能（イベント補完・旅程編集）
  - ユーザー認証・管理
  - 旅のしおり共有

### 外部システム
- **OpenAI ChatGPT API**: AI機能提供（GPT-4o Mini、GPT-4、GPT-3.5 Turbo）
- **メールサービス**: 認証メール送信、パスワードリセット

### データストレージ
- **PostgreSQL**: ユーザー情報、旅程データ、認証トークン

### インフラ・デプロイ
- **CapRover**: アプリケーション配信、サーバー管理
- **GitHub**: ソースコード管理、CI/CDパイプライン

## 主要な関係性

- ユーザーがTrip Shioriシステムを利用して旅程を作成・編集
- Trip ShioriがOpenAI APIを利用してAI機能を提供
- メールサービスとの連携でユーザー認証を実現
- PostgreSQLでデータを永続化
- GitHub Actions → CapRover のCI/CDパイプラインで自動デプロイ
