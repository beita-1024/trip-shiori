# ===== Config =====
COMPOSE ?= docker compose
SERVICES ?= backend frontend
ENV ?= dev
# 例) make deploy ENV=stg

# CapRover環境変数の読み込み
-include .env

# 環境別のComposeファイル設定
DEV_COMPOSE_FILES = -f docker-compose.yml
PROD_COMPOSE_FILES = -f docker-compose.yml -f docker-compose.prod.yml

.DEFAULT_GOAL := help
.PHONY: \
  help \
  up \
  up-dev \
  up-prod \
  down \
  down-dev \
  down-prod \
  restart \
  restart-backend \
  restart-frontend \
  restart-db \
  build \
  build-dev \
  build-prod \
  logs \
  logs-backend \
  logs-frontend \
  logs-db \
  ps \
  sh-backend \
  sh-frontend \
  lint \
  test \
  test-backend \
  test-frontend \
  test-main \
  test-auth \
  test-shared \
  test-copy \
  test-password-reset \
  test-verbose \
  test-coverage \
  test-itinerary \
  test-user \
  db-migrate \
  db-seed \
  db-reset-seed \
  db-studio \
  swagger-ui \
  swagger-ui-stop \
  swagger-ui-local \
  snapshot \
  deploy \
  init

# Makefile内の "##" コメント付きコマンド一覧を色付きで表示
help: ## コマンド一覧
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS=":.*?## "}; { \
			printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2 \
		}'
# INFO: shのコマンドは読みにくいのでメモで書いておく
# grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST)
#   -E: 拡張正規表現を有効化
#   '^[a-zA-Z0-9_-]+:.*?## ':
#     - 行頭からターゲット名（英数字・_・-）+コロン
#     - 任意の文字列（コマンド本体）を挟み
#     - "## " で終わるコメントがある行のみ抽出
#   $(MAKEFILE_LIST): 現在のMakefile（インクルード含む）を対象
#
# awk 'BEGIN {FS=":.*?## "}; { ... }'
#   BEGIN {FS=":.*?## "}: フィールド区切りを「:（コマンド本体）## 」に設定
#   { printf ... }: 
#     - $$1: ターゲット名
#     - $$2: ヘルプコメント
#     - printfで色付き（\033[36m:シアン）でターゲット名を左詰14桁、コメントを表示
#     - \033[0mで色リセット


up: ## 開発環境でCompose起動（バックグラウンド）
	$(COMPOSE) $(DEV_COMPOSE_FILES) up -d

up-dev: ## 開発環境でCompose起動（バックグラウンド）
	$(COMPOSE) $(DEV_COMPOSE_FILES) up -d

up-prod: ## 本番環境でCompose起動（バックグラウンド）
	$(COMPOSE) $(PROD_COMPOSE_FILES) up -d

down: ## 開発環境を停止＆ネットワーク片付け
	$(COMPOSE) $(DEV_COMPOSE_FILES) down

down-dev: ## 開発環境を停止＆ネットワーク片付け
	$(COMPOSE) $(DEV_COMPOSE_FILES) down

down-prod: ## 本番環境を停止＆ネットワーク片付け
	$(COMPOSE) $(PROD_COMPOSE_FILES) down

restart: ## 開発環境のサービス再起動（down + up）
	$(COMPOSE) $(DEV_COMPOSE_FILES) down
	$(COMPOSE) $(DEV_COMPOSE_FILES) up -d

restart-backend: ## backendサービスのみ再起動（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) restart backend

restart-frontend: ## frontendサービスのみ再起動（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) restart frontend

restart-db: ## dbサービスのみ再起動（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) restart db

build: ## 開発環境のイメージビルド
	$(COMPOSE) $(DEV_COMPOSE_FILES) build

build-dev: ## 開発環境のイメージビルド
	$(COMPOSE) $(DEV_COMPOSE_FILES) build

build-prod: ## 本番環境のイメージビルド
	$(COMPOSE) $(PROD_COMPOSE_FILES) build

logs: ## 全サービスのログ追跡（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) logs -f --tail=100

logs-backend: ## backendサービスのログ追跡（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) logs -f --tail=100 backend

logs-frontend: ## frontendサービスのログ追跡（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) logs -f --tail=100 frontend

logs-db: ## dbサービスのログ追跡（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) logs -f --tail=100 db

ps: ## 稼働状況（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) ps

sh-backend: ## backendのシェル（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) exec backend sh

sh-frontend: ## frontendのシェル（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) exec frontend sh

lint: ## まとめてlint（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) run --rm backend npm run lint
	$(COMPOSE) $(DEV_COMPOSE_FILES) run --rm frontend npm run lint

test: ## 全テスト実行（backend + frontend）（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) run --rm backend npm test -- --watch=false
	$(COMPOSE) $(DEV_COMPOSE_FILES) run --rm frontend npm test -- --watch=false

test-backend: ## backendの全テスト実行（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) run --rm backend npm test -- --watch=false

test-frontend: ## frontendの全テスト実行（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) run --rm frontend npm test -- --watch=false

test-main: ## メインE2Eテスト実行（全API統合テスト）（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) run --rm backend npm test src/app.test.ts -- --watch=false

test-auth: ## 認証・ユーザー管理APIテスト実行（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) run --rm backend npm test src/controllers/auth.test.ts -- --watch=false

test-shared: ## 共有旅程アクセスAPIテスト実行（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) run --rm backend npm test src/controllers/sharedItineraryController.test.ts -- --watch=false

test-copy: ## 旅程複製・マイグレーションAPIテスト実行（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) run --rm backend npm test src/controllers/itineraryCopyController.test.ts -- --watch=false

test-password-reset: ## パスワードリセット機能テスト実行（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) run --rm backend npm test src/controllers/authController.test.ts -- --watch=false

# テスト実行オプション（詳細ログ付き）
test-verbose: ## 全テスト実行（詳細ログ付き）（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) run --rm backend npm test -- --watch=false --verbose
	$(COMPOSE) $(DEV_COMPOSE_FILES) run --rm frontend npm test -- --watch=false --verbose

test-coverage: ## 全テスト実行（カバレッジ付き）（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) run --rm backend npm test -- --watch=false --coverage
	$(COMPOSE) $(DEV_COMPOSE_FILES) run --rm frontend npm test -- --watch=false --coverage

# 特定のテストスイート実行
test-itinerary: ## 旅程関連APIテスト実行（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) run --rm backend npm test -- --testNamePattern="旅程管理API|旅程共有機能API|公開旅程アクセスAPI|旅程複製・マイグレーションAPI" --watch=false

test-user: ## ユーザー関連APIテスト実行（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) run --rm backend npm test -- --testNamePattern="ユーザー管理API|認証エンドポイント" --watch=false

# 環境別の使用方法:
# 開発環境:
#   make up                    # 開発環境で起動（devステージ、ホットリロード）
#   make up-dev               # 同上
#   make down                 # 開発環境を停止
#   make build                # 開発環境のイメージビルド
#   make logs                 # 開発環境のログ確認
#
# 本番環境:
#   make up-prod              # 本番環境で起動（runtimeステージ、最適化済み）
#   make down-prod            # 本番環境を停止
#   make build-prod           # 本番環境のイメージビルド
#
# テスト実行例:
# make test                    # 全テスト実行（開発環境）
# make test-backend           # backendの全テスト（開発環境）
# make test-main              # メインE2Eテスト（開発環境）
# make test-auth              # 認証APIテスト（開発環境）
# make test-shared            # 共有旅程APIテスト（開発環境）
# make test-copy              # 複製・マイグレーションAPIテスト（開発環境）
# make test-verbose           # 詳細ログ付きテスト（開発環境）
# make test-coverage          # カバレッジ付きテスト（開発環境）

db-migrate: ## DBマイグレーション（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) exec backend npm run db:migrate

db-seed: ## 初期データ投入（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) exec backend npm run db:seed

db-reset-seed: ## データベースリセット + 初期データ投入（開発環境）
	@echo "データベースをリセットして初期データを投入します..."
	$(COMPOSE) $(DEV_COMPOSE_FILES) exec backend npx prisma migrate reset --force --skip-seed
	$(COMPOSE) $(DEV_COMPOSE_FILES) exec backend npm run db:seed
	@echo "データベースリセットとシードが完了しました"

db-studio: ## Prisma Studio起動（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) exec backend npx prisma studio

# INFO: set-cookieを受け取って使うには、127.0.0.1:8081じゃなくて、localhost:8081 でブラウザを開く必要がある。
swagger-ui: ## Swagger UI起動（Docker使用）
	@echo "Starting Swagger UI on http://localhost:8081"
	@docker run -d --name trip-shiori-swagger-ui \
		-p 8081:8080 \
		-v $(PWD)/docs/api:/usr/share/nginx/html/api \
		-e SWAGGER_JSON=/usr/share/nginx/html/api/openapi.yaml \
  	-e WITH_CREDENTIALS=true \
		swaggerapi/swagger-ui || \
		(docker start trip-shiori-swagger-ui && echo "Swagger UI container restarted")
	@echo "Swagger UI is running at http://localhost:8081"

swagger-ui-stop: ## Swagger UI停止
	@echo "Stopping Swagger UI..."
	@docker stop trip-shiori-swagger-ui 2>/dev/null || echo "Swagger UI container not running"
	@docker rm trip-shiori-swagger-ui 2>/dev/null || echo "Swagger UI container not found"


# INFO: WITH_CREDENTIALS=trueはこっちではできないので注意
swagger-ui-local: ## Swagger UI起動（ローカル）
	@echo "Starting Swagger UI locally on http://localhost:8081"
	@npx swagger-ui-watcher docs/api/openapi.yaml --port 8081

snapshot: ## プロジェクトのスナップショットを親ディレクトリに圧縮保存
	@echo "プロジェクトのスナップショットを作成中..."
	@TIMESTAMP=$$(date +"%Y%m%d_%H%M%S"); \
	PROJECT_NAME=$$(basename "$$(pwd)"); \
	PARENT_DIR=$$(dirname "$$(pwd)"); \
	ARCHIVE_NAME="$${PROJECT_NAME}_snapshot_$${TIMESTAMP}.tar.gz"; \
	echo "アーカイブ名: $${ARCHIVE_NAME}"; \
	echo "保存先: $${PARENT_DIR}/$${ARCHIVE_NAME}"; \
	tar -czf "$${PARENT_DIR}/$${ARCHIVE_NAME}" \
		--exclude='node_modules' \
		--exclude='.git' \
		--exclude='dist' \
		--exclude='build' \
		--exclude='coverage' \
		--exclude='*.log' \
		--exclude='.env.local' \
		--exclude='.env.production' \
		--exclude='*.tmp' \
		--exclude='.DS_Store' \
		--exclude='Thumbs.db' \
		-C "$$(pwd)" .; \
	echo "スナップショットが作成されました: $${PARENT_DIR}/$${ARCHIVE_NAME}"; \
	ls -lh "$${PARENT_DIR}/$${ARCHIVE_NAME}"


init: ## 初回セットアップ（DBマイグレーション + シード）（開発環境）
	$(COMPOSE) $(DEV_COMPOSE_FILES) up -d
	@echo "データベースの初期化を待機中..."
	@sleep 10
	$(COMPOSE) $(DEV_COMPOSE_FILES) exec backend npm run db:migrate
	$(COMPOSE) $(DEV_COMPOSE_FILES) exec backend npm run db:seed


# ===== CapRover デプロイ設定 =====
# 現在のGitブランチを取得（デフォルト: 現在のブランチ）
BRANCH ?= $(shell git rev-parse --abbrev-ref HEAD)

# CapRover CLI Commands: https://caprover.com/docs/cli-commands.html
# デプロイ用の共通関数定義
# 引数: $(1) = App Token, $(2) = App Name
define _deploy_cap
	@echo "Deploying $(2) (branch=$(BRANCH)) to $(CAPROVER_URL) ..."
	npx --yes caprover deploy \
		--caproverUrl "$(CAPROVER_URL)" \
		--caproverApp "$(2)" \
		--appToken "$(1)" \
		--branch "$(BRANCH)"
	@echo "✅ Deployment completed for $(2)"
endef

.PHONY: deploy-cap-frontend deploy-cap-backend deploy

# Frontend デプロイ
deploy-cap-frontend: ## CapRoverへ frontend をデプロイ
	$(call _deploy_cap,$(CAPROVER_TOKEN_FE),$(CAPROVER_APP_FE))

# Backend デプロイ
deploy-cap-backend: ## CapRoverへ backend をデプロイ
	$(call _deploy_cap,$(CAPROVER_TOKEN_BE),$(CAPROVER_APP_BE))

# 両方デプロイ（Backend → Frontend の順序）
deploy-cap: deploy-cap-backend deploy-cap-frontend ## 両方デプロイ（Backend → Frontend）
