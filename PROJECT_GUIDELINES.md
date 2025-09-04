# プロジェクト基本方針（暫定）

本ドキュメントは、本プロジェクトの最小方針をまとめたもの。  
**原則：軽量・実用・スピード優先**
やらないことを明確にし、必要になった時に追加する。

**保留**は、基本方針整備Issue１本にまとめて、必要になったら分割する。

---

## プロジェクト基本方針

- **目的/非目的（Out of Scope）**：
  - [ ] **保留**（トップのREADMEに最終的に1枚で掲載）
- **非機能要件（暫定）**：**検討予定**
  - [ ] **保留**
- **リリース方式**：**継続デリバリ**
  - 初期は **VPS (CapRover)** で運用 → 後に **AWS + Terraform (IaC)** へ移行
- **バージョニング**：Conventional Commits
- **リポ構成**：**モノレポ + pnpm ワークスペース**
  - **subtree 不使用**。CIで Docker イメージをビルド → レジストリへ Push → CapRover/AWS で Pull

---

## ブランチ／変更管理

- **ブランチ戦略**：**Trunk-Based**
  - `main` 固定 + 短命 `feature/*`
  - 週1で軽量 **`release/vX.Y.Z`** を切ってまとめ検収
  - 緊急は `hotfix/*` → `main` へ、直後に `release/*` に cherry-pick
- **コミット規約**：**Conventional Commits**
  - 種別：`feat|fix|chore|refactor|docs|test|ci|build`
  - スコープ固定語彙：`frontend` `backend` `infra` `docs`
  - 例：
    ```
    feat(frontend): 旅程カードに共有ボタン追加
    fix(backend): /users POSTの400レスポンスをRFC7807形式へ
    refactor(infra): Actionsワークフローをマトリクス化
    ```
- **PR運用**：PRテンプレ + 自動チェック必須 + Draft開始
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

## 環境・デプロイ

- **環境段**：
  - [ ] **保留**（`dev/stg/prod` の切り方を後で確定）
- **デプロイ方法**：GitHub Actions → CapRover / AWS（リリース方式に準拠）
- **コンテナ戦略**：
  - [ ] **保留**（マルチステージ・rootless・最小ベース）
- **イメージタグ**：**`latest` + `sha` の2本立てで開始**（SemVer は後で導入）
- **IaC (Terraform)**：**CapRover 定着後に着手**
- **シークレット管理**：
  - `.env.example` を整備し、`.env` はローカル管理
  - OIDC + 環境側 KV（GitHub Secrets は最小限）**→ 詳細は後で Issue 化**

---

## コーディング規約

- **TypeScript**：`"strict": true` / ESLint + Prettier / `@/` path alias 採用
- **Next.js/React**：**データ取得は原則 Server**（Server Actions/Route Handlers 優先）
- **Express(API)**：
  - [ ] **保留**（OpenAPI / Idempotency / RateLimit / Pagination 規約）
- **フロント構成**：`/app` ルータ、`components/ui`（UI）と `features/**`（機能）を分離
- **バック構成**：
  - [ ] **保留**（`/modules`：use-case / repo / entity、`/jobs`：cron/queue）
- **コメント規約**：軽量運用。`NOTE: 本文` を基本。必要に応じ本文でタグ補足

---

## データ＆スキーマ運用

- **DB選定/接続ポリシー**：
  - [ ] **保留**（プール/タイムアウト）
- **マイグレーション**：**Prisma Migrate**（運用詳細は保留）
- **Seed 方針**：
  - [ ] **保留**（`local/dev` 限定・冪等）
- **データライフサイクル**：
  - [ ] **保留**（保持期間/匿名化/削除API）

---

## API設計・互換性

- **API バージョニング**：**`/v1` 形式へ移行**
- **エラー設計（RFC7807 風）**：
  - [ ] **保留**
- **リトライ/タイムアウト/`idempotency-key`**：
  - [ ] **保留**
- **レート制御**：
  - [ ] **保留**
  - **LLM API のレート制御は早めに実施**（負荷/コスト対策）

---

## セキュリティ

- **認証/認可**：**JWT (HttpOnly Cookie)**。将来的に **Lucia** 検討
- **入力/出力バリデーション**：**新規エンドポイントから `zod`/`valibot` を順次適用**
- **依存監視**：**Dependabot + `npm audit` を使用**
- **SAST/Secrets検出**：
  - [ ] **保留**（CodeQL / Trivy / Gitleaks）
- **ヘッダー**：
  - [ ] **保留**（Helmet / CSP / HSTS）
- **機密ログ抑止（PII/Secrets マスキング）**：
  - [ ] **保留**

---

## テスト戦略

- **単体**：**Jest/Vitest**（まずは最小で導入）
  - **E2E は Jest で導入**（APIレベルの最小ケース）
- **サービス統合（Supertest/MSW）**：
  - [ ] **保留**
- **E2E（UI）**：**Playwright**（主要 UX シナリオを最少本数）
- **CI 速度**：**CI は lint + unit のみ**で開始（並列/DB最適化は後で）
- **失敗時アーティファクト**：
  - [ ] **保留**


---


---

## ドキュメント＆意思決定

- **README（必須）**：**書く**
  - 起動手順 / デプロイ概要 / 簡易構成図 / 非機能（暫定1〜3行）
- **API ドキュメント（OpenAPI）**：
  - [ ] **保留**
- **開発ガイド（コマンド一覧）**：
  - [ ] **保留**（`pnpm` へ移行）

---

