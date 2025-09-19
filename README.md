# プロジェクト名

## 概要
<!-- TODO: 詳細を埋める -->

## 技術スタック
- Frontend: Next.js (React + TailwindCSS)
- Backend: Express + Prisma
- DB: PostgreSQL
- Infra: Docker / CapRover / GitHub Actions

## ディレクトリ構成
<!-- TODO: 詳細を埋める -->

## 構成図

Next.js フロントエンド、Express(API)+Prisma、PostgreSQL、CI/CD（GitHub Actions→Docker Registry→CapRover）の構成図。

```mermaid
graph TB
    %% フロントエンド
    subgraph "Frontend"
        A[Next.js App] --> B[React Components]
        B --> C[TypeScript]
    end
    
    %% バックエンド
    subgraph "Backend"
        D[Express.js API] --> E[Prisma ORM]
        E --> F[PostgreSQL Database]
        D --> G[Authentication]
        D --> H[Validation]
    end
    
    %% CI/CD パイプライン
    subgraph "CI/CD Pipeline"
        I[GitHub Repository] --> J[GitHub Actions]
        J --> K[Build & Test]
        K --> L[Docker Image]
        L --> M[Docker Registry]
        M --> N[CapRover Deployment]
    end
    
    %% 接続
    A --> D
    N --> O[Production Server]
    
    %% スタイル
    classDef frontend fill:#e1f5fe
    classDef backend fill:#f3e5f5
    classDef cicd fill:#e8f5e8
    classDef database fill:#fff3e0
    
    class A,B,C frontend
    class D,E,F,G,H backend
    class I,J,K,L,M,N cicd
    class F database
```
## 起動方法
- 開発環境の起動手順
<!-- TODO: 詳細を埋める -->
- 必要な依存関係（pnpm / Docker など）
<!-- TODO: 詳細を埋める -->

## デプロイ方法

### CapRover デプロイ

1. **環境変数設定**
   ```bash
   # プロジェクトルートに .env ファイルを作成
   CAPROVER_URL=https://captain.your-domain.com
   CAPROVER_APP_FE=your-frontend-app-name
   CAPROVER_TOKEN_FE=your-frontend-deploy-token
   CAPROVER_APP_BE=your-backend-app-name
   CAPROVER_TOKEN_BE=your-backend-deploy-token
   ```

2. **デプロイ実行**
   ```bash
   # 両方デプロイ（Backend→Frontend の順で実行）
   make deploy-cap
   
   # 個別デプロイ
   make deploy-cap-frontend
   make deploy-cap-backend
   ```

詳細は [環境変数設定ガイド](./docs/environment-variables.md) を参照してください。

### CI/CD パイプライン
- GitHub Actions → Docker Registry → CapRover
- イメージタグ運用（latest + sha）

## プロジェクト基本方針
- [プロジェクトガイドライン](./PROJECT_GUIDELINES.md) を参照

## コーディング規約
- TypeScript strict / ESLint+Prettier
<!-- TODO: 詳細を埋める -->
- Conventional Commits / PR運用
<!-- TODO: 詳細を埋める -->

## テスト
- 単体テスト (Jest/Vitest)
<!-- TODO: 詳細を埋める -->
- E2E テスト (Playwright)
<!-- TODO: 詳細を埋める -->

## セキュリティ
- JWT (HttpOnly Cookie)
<!-- TODO: 詳細を埋める -->
- Dependabot / npm audit
<!-- TODO: 詳細を埋める -->

## ライセンス
- 本プロジェクトはポートフォリオ用途（後に個人制作用）のためUNLICENSED
