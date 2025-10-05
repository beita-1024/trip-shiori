# プロジェクト基本方針（暫定）

本ドキュメントは、本プロジェクトの最小方針をまとめたもの。  
**原則：軽量・実用・スピード優先**
やらないことを明確にし、必要になった時に追加する。

---

## プロジェクト基本方針

- **目的/非目的（Out of Scope）**：
  - **目的**: 旅行のしおり（旅程表）をドラッグ＆ドロップで直感的に編集し、A4三つ折り印刷に最適化されたPDFを即座に生成できるWebサービス
  - **非目的（当面対応しない範囲）**:
    - 旅行予約・決済機能（外部サービス連携は将来検討）
    - 本格ナビ/地図/オフラインマップ提供
    - 旅行SNS/レビュー集約プラットフォーム
    - リアルタイム共同編集（現在はURL共有のみ）
    - 多言語対応（日本語のみ）
- **非機能要件（暫定）**： 保留
- **リリース方式**：**継続デリバリ**
  - **GCP Cloud Run + Terraform (IaC)** で運用
- **バージョニング**：Conventional Commits
- **リポ構成**：**モノレポ + pnpm ワークスペース**
  - **subtree 不使用**。CIで Docker イメージをビルド → GCP Artifact Registry → Cloud Run でデプロイ

---

## ブランチ運用の基本方針（最小セット）

### 基本戦略
- **デフォルト**: `main`（常にデプロイ可能）
- **開発**: 短命のトピックブランチのみ
- **形式**: `<type>/<slug>`（例：`feat/itinerary-share`、`fix/login-500`、`chore/20250904`）
- **リリース**: タグのみ使用（`release/vX.Y.Z`ブランチは作成しない）
- **緊急**: `hotfix/<slug>` → `main` に速攻 → タグでリリース
- **マージ方式**: Squash merge（PRタイトル＝最終コミット）
- **コミットメッセージ**: Conventional Commits 準拠
- **履歴方針**: Linear history（rebase pull 推奨／merge commit 禁止）

### ブランチ命名規約

| 種別      | 命名例                              | 用途             |
|:----------|:------------------------------------|:-----------------|
| feat      | feat/{summary-kebab}                | 新機能           |
| fix       | fix/{summary-kebab}                 | バグ修正         |
| chore     | chore/{yyyymmdd-or-summary}         | 雑務・定期作業   |
| docs      | docs/{summary-kebab}                | ドキュメント     |
| infra     | infra/{summary-kebab}               | インフラ・CI/CD  |
| hotfix    | hotfix/{summary-kebab}              | 緊急修正         |

### ライフサイクル
1. **Issue作成**（タイトルは CC 準拠 or 自然文、ラベルで種別/優先度付与）
2. **ブランチ切る**（Issue番号を含めてもOK：`feat/itinerary-share-#42`）
3. **PR作成**（レビュー準備が整ってからPRを出す／Draft PRは使わない）
4. **レビュー・CIチェック通過** → セキュリティホールや誤動作につながる部分などは必ず修正する。
5. **Squash merge** → `main`へにマージ、`.github/workflows/deploy-development.yml`ワークフロートリガ→ステージングデプロイ
6. **リリース時はタグ付け** `v*`で`.github/workflows/deploy-development.yml`トリガ→ 本番デプロイ

### タグ運用
- **main 常に安定**（デプロイ可能状態を維持）
- **リリース手順**：
  ```bash
  git tag v1.0.0 && git push origin v1.0.0 → デプロイ
  ```
- **CI連携**：
  - `push: tags: [ 'v*' ]` → 本番デプロイ
  - `push: branches: [ main ]` → ステージング or CapRover テスト

### 詳細設定
- **コミット規約**：**Conventional Commits**
  - 種別：`feat|fix|chore|refactor|docs|test|ci|build`
  - スコープ固定語彙：`frontend` `backend` `infra` `docs`
  - 例：
    ```
    feat(frontend): 旅程カードに共有ボタン追加
    fix(backend): /users POSTの400レスポンスをRFC7807形式へ
    refactor(infra): Actionsワークフローをマトリクス化
    ```
- **PR運用**：PRテンプレ + 自動チェック必須
  - CodeRabbit でファーストレビュー（自動コメント）→ 手動レビュー → マージ
- **Git運用**：**Squash and merge 一択**
  - PRマージ：Squash and merge（履歴が一直線・読みやすい・リバートも楽）
  - ローカル取り込み：`git pull --rebase` をデフォルト（マージコミットが増えない）
  - main を rebase しない・force-push しない（共有履歴は書き換えない）
  - リポジトリ設定（GitHub）：
    - 「Allow squash merging」のみ許可（Merge/Rebase mergesは無効）
    - Branch protection: `main` に対して
      - Require pull request before merging / 直push禁止
      - Require linear history / Force-push禁止
      - Require status checks to pass（CI合格）
  - 設定例：
    ```bash
    git config --global pull.rebase true
    git config --global branch.autosetuprebase always
    git config --global rerere.enabled true
    # 衝突解消の取り回し改善と追跡ブランチの掃除をデフォルト化
    git config --global rebase.autoStash true
    git config --global fetch.prune true
    ```
- **CHANGELOG**：**作らない方針**
  - 代替：週次リリース時に PR タイトルをユーザー向けにし、タグ/リリースの説明文で要約

**Issue テンプレ**（配置：`.github/ISSUE_TEMPLATE/`）
- `feature_request.yml`（機能）
- `bug_report.yml`（バグ）
- `docs_task.yml`（任意）
- `config.yml`（blank 受付停止）

---

## PRレビュー運用

**目的**: 未対応コメントの停滞を防ぎ、PR本文へ軽量に集約する。

- **分類**: コメント先頭に `[Must]`（必須）/`[Nice]`（任意）/`[Q]`（質問）
- **Resolve原則**: 実装者が対応後に自分で Resolve。必要あればレビュワーが Unresolve
- **PR本文へ集約**: Issue化しない小さな残件はPR本文の専用セクションに要約
- **Issue化の基準**: 複数PR横断・期限/担当が必要・影響が広い場合のみIssue化
- **再レビュー依頼**: Must のみ再確認依頼。差分リンクを添付

### PR本文（追記用セクション）
```
## コメント整理
- Must（マージ前に対応）:
  - #<comment-link or short-note>
- Nice（任意、後回し可）:
  - ...
- Q（結論メモ）:
  - 論点: … / 結論: … / 根拠: …

## 残件・対応しない・未着手（Issue化しない軽量メモ）
- 残件（追従予定・期限/担当任意）: …
- 対応しない（理由を1行）: …
- 未着手（次PRに回す）: …
```

---

## CodeRabbit 運用（設定/使い方/Closed PR）

### 設定の要点
- 設定: `/.coderabbit.yaml`（日本語レビュー、軽量トリアージの促しを有効化）
- 自動レビュー: PR作成/Push時に自動、Draftは既定で無効
- 事前チェック: PR本文に「コメント整理」「残件メモ」セクションの有無を警告

### レビュー時の使い方
1. コメントに `[Must] / [Nice] / [Q]` を接頭辞で付ける
2. CodeRabbit のサマリに従い、PR本文の該当セクションを更新
3. 再レビュー依頼は Must のみ、差分リンクを添付

### Closed PR の扱い
- 原則は手動で「トリアージメモ（最終）」をコメントに追記して完了
- 要約支援が必要な場合のみ、一時的に Reopen → 総括作成 → 反映 → Close（承認の無効化に注意）

#### トリアージメモ（最終）雛形
```
### トリアージメモ（最終）
- Must（別対応が必要）:
  - …
- Nice（次回リファクタ候補）:
  - …
- Q（結論）:
  - 論点: … / 結論: …（根拠: …）
- 後続: Issue化したもの → #123, #124
```

## 環境・デプロイ

- **環境段**：
  - **dev/prod** の2段階構成（Terraformで環境分離）
- **デプロイ方法**：GitHub Actions → GCP Cloud Run（Terraform + Docker）
- **コンテナ戦略**：
  - **マルチステージビルド**: dev/builder/runtime（3段階構成）
  - **rootless実行**: 非特権ユーザー（node）で実行
  - **最小ベース**: node:22-bookworm-slim（軽量化済み）
  - **本番最適化**: 本番用依存関係のみ、ビルド済みファイルのみコピー
- **イメージタグ**：**`latest` + `short_sha` の2本立て**（Terraformで自動生成）
- **IaC (Terraform)**：**GCP Cloud Run + Artifact Registry で運用中**
- **シークレット管理**：
  - `.env.example` を整備し、`.env` はローカル管理
  - OIDC + 環境側 KV（GitHub Secrets は最小限）**→ 詳細は後で Issue 化**
  - **対応ファイル**:
    - `backend/Dockerfile` - マルチステージビルド・rootless実行
    - `frontend/Dockerfile` - マルチステージビルド・rootless実行
    - `docker-compose.yml` - 開発環境設定（devステージ）
    - `docker-compose.prod.yml` - 本番環境設定（runtimeステージ）
    - `terraform/environments/*/main.tf` - イメージタグ自動生成（short_sha）

---

## コーディング規約

- **TypeScript**：`"strict": true` / ESLint + Prettier / `@/` path alias 採用
- **Next.js/React**：**データ取得は原則 Server**（Server Actions/Route Handlers 優先）
- **Express(API)**：
  - **OpenAPI 3.1** で仕様書管理（`docs/api/openapi.yaml`）
  - **zod** でバリデーション、**TSDoc** でエンドポイントドキュメント
- **フロント構成**：`/app` ルータ、`components/`（UI）と機能別ディレクトリを分離
- **バック構成**：
  - **実装済み**: `/controllers`、`/services`、`/middleware`、`/validators`、`/jobs`
  - **jobs**: cron/queue（shareCleanupJob実装済み）
  - **modules**: use-case/repo/entityは未実装（現在はcontrollers/servicesで対応）
- **コメント規約**：軽量運用。`NOTE: 本文` を基本。必要に応じ本文でタグ補足
- **対応ファイル**:
  - `backend/tsconfig.json` - TypeScript strict設定
  - `frontend/tsconfig.json` - TypeScript strict設定・@/ path alias
  - `backend/src/` - controllers/services/middleware/validators/jobs構成
  - `frontend/src/app/` - Next.js App Router構成
  - `frontend/src/components/` - UIコンポーネント構成
  - `docs/api/openapi.yaml` - OpenAPI仕様書

---

## データ＆スキーマ運用

- **DB選定/接続ポリシー**：
  - **データベース**: PostgreSQL 16（GCP Cloud SQL）
  - **接続プール**: Prisma標準設定（デフォルト: 10接続、明示的設定なし）
  - **タイムアウト**: 明示的設定なし（Prismaデフォルト使用）
  - **環境分離**: dev（db-f1-micro）、prod（db-g1-small）
  - **バックアップ**: 7日間保持、PITR有効
  - **対応ファイル**:
    - `backend/src/config/prisma.ts` - PrismaClient設定
    - `terraform/environments/dev/main.tf` - 開発環境DB設定
    - `terraform/environments/prod/main.tf` - 本番環境DB設定
    - `backend/prisma/schema.prisma` - データベーススキーマ定義
- **マイグレーション**：**Prisma Migrate**
- **Seed 方針**：
  - **対象環境**: `local/dev` 限定（`RUN_SEED=true`で制御）
  - **冪等性**: 既存データはスキップ、新規のみ作成
  - **データ内容**: デモユーザー5名（認証済み状態）
  - **実行タイミング**: コンテナ起動時（entrypoint.sh）
  - **本番環境**: シード実行なし（セキュリティ考慮）
  - **対応ファイル**:
    - `backend/prisma/seed.ts` - シードデータ定義・実行ロジック
    - `backend/entrypoint.sh` - コンテナ起動時のシード実行制御
- **データライフサイクル**：
  - **保持期間**: 旅程データ1年間、認証トークン7日間
  - **自動削除**: 期限切れ共有設定（cron job）、非アクティブユーザー（手動）
  - **削除API**: ユーザー削除時はカスケード削除（関連データも削除）
  - **匿名化**: 不要（旅程データにPII含まず）
  - **バックアップ**: 7日間保持、PITR有効
  - **対応ファイル**:
    - `backend/src/jobs/shareCleanupJob.ts` - 共有設定の定期クリーンアップ（毎日2:00 AM）
    - `backend/src/services/shareCleanupService.ts` - 期限切れ・孤立・古い共有設定の削除ロジック
    - `backend/src/controllers/usersController.ts` - ユーザー削除API（カスケード削除）
    - `backend/prisma/schema.prisma` - カスケード削除設定（onDelete: Cascade）

---

## API設計・互換性

- **API バージョニング**：
  - 現在は `/api/` プレフィックスで運用（将来的に `/v1/` への移行を検討）
- **エラー設計（RFC7807 風）**：
  - **zod** でバリデーション、統一エラーレスポンス形式
- **リトライ/タイムアウト/`idempotency-key`**：
  - **タイムアウト**: LLM API（60秒）、一般API（30秒）
  - **idempotency**: TSDocで明記（冪等/非冪等の区別）
  - **リトライ**: 未実装（LLM APIのみ実装済み）
- **レート制御**：
  - **Express ミドルウェア**で実装済み（IPベース、メモリストレージ）
  - エンドポイント別に設定（認証: 15分/3-5回、一般: 60分/30-120回）
  - **LLM API のレート制御は早めに実施**（負荷/コスト対策）
- **対応ファイル**:
  - `backend/src/app.ts` - APIルーティング（/api/プレフィックス）
  - `backend/src/middleware/rateLimit.ts` - レート制御ミドルウェア
  - `backend/src/controllers/*Router.ts` - エンドポイント別レート制御設定
  - `backend/src/adapters/chatGptClient.ts` - LLM APIタイムアウト設定
  - `docs/api/openapi.yaml` - API仕様書

---

## セキュリティ

- **認証/認可**：**JWT (HttpOnly Cookie)**。将来的に **Lucia** 検討
- **入力/出力バリデーション**：**新規エンドポイントから `zod`/`valibot` を順次適用**
- **依存監視**：**Dependabot + `npm audit` を使用**
- **SAST/Secrets検出**：
  - **CodeRabbit統合**: gitleaks・checkov・markdownlint・languagetool
  - **シークレット検出**: gitleaks（APIキー・パスワード・トークン等）
  - **IaC静的解析**: checkov（Terraform・セキュリティ設定）
  - **文書品質**: markdownlint・languagetool（日本語/英語校正）
  - **対応ファイル**:
    - `.coderabbit.yaml` - CodeRabbit設定（ツール統合・レビュー方針）
- **ヘッダー**：
  - **Helmet** で実装済み（CSP / HSTS / XSS Filter / Frameguard等）

---

## テスト戦略

- **単体・統合テスト**：**Jest + Supertest**（実装済み）
  - **E2E は Jest + Supertest で実装**（APIレベルの統合テスト）
  - テストファイル: `app.test.ts`, `authController.test.ts`, `sharedItineraryController.test.ts` 等
- **サービス統合（Supertest）**：
  - **実装済み**（APIエンドポイントの統合テスト）
- **E2E（UI）**：
  - UIが大きく変わる可能性がまだあるので、未導入
  - 実装する場合はPlaywrightを採用予定
- **CI**：**CI は lint + test で実装済み**（Docker Compose + Jest）
- **対応ファイル**:
  - `.github/workflows/ci.yml` - CI/CDワークフロー（lint + test）
  - `backend/src/*.test.ts` - テストファイル（6ファイル）
  - `Makefile` - テスト・lint実行コマンド
  - `docker-compose.yml` - テスト環境構築


---

## ドキュメント＆意思決定

- **README**：
  - プロダクト概要・設計判断・参照リンクの総合ガイド
  - 主要機能・ユースケース・設計背景・技術選定
  - アクセシビリティ・セキュリティ・データ設計の方針
  - 主要ドキュメントへのリンク一覧
- **API ドキュメント（OpenAPI）**：
  - **`docs/api/openapi.yaml`** で仕様書管理、Swagger UI で確認可能
- **開発ガイド（コマンド一覧）**：
  - **`docs/quick-start.md`** でクイックスタート手順を提供

---

