# ===== Config =====
COMPOSE ?= docker compose
SERVICES ?= backend frontend
ENV ?= dev
# 例) make deploy ENV=stg

.DEFAULT_GOAL := help
.PHONY: \
  help \
  up \
  down \
  restart \
  build \
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


up: ## Compose起動（バックグラウンド）
	$(COMPOSE) up -d

down: ## 停止＆ネットワーク片付け
	$(COMPOSE) down

restart: ## サービス再起動（down + up）
	$(COMPOSE) down
	$(COMPOSE) up -d

build: ## イメージビルド
	$(COMPOSE) build

logs: ## 全サービスのログ追跡
	$(COMPOSE) logs -f --tail=100

logs-backend: ## backendサービスのログ追跡
	$(COMPOSE) logs -f --tail=100 backend

logs-frontend: ## frontendサービスのログ追跡
	$(COMPOSE) logs -f --tail=100 frontend

logs-db: ## dbサービスのログ追跡
	$(COMPOSE) logs -f --tail=100 db

ps: ## 稼働状況
	$(COMPOSE) ps

sh-backend: ## backendのシェル
	$(COMPOSE) exec backend sh

sh-frontend: ## frontendのシェル
	$(COMPOSE) exec frontend sh

lint: ## まとめてlint
	$(COMPOSE) exec backend npm run lint || true
	$(COMPOSE) exec frontend npm run lint || true

test: ## 全テスト実行（backend + frontend）
	$(COMPOSE) exec backend npm test -- --watch=false || true
	$(COMPOSE) exec frontend npm test -- --watch=false || true

test-backend: ## backendの全テスト実行
	$(COMPOSE) exec backend npm test -- --watch=false || true

test-frontend: ## frontendの全テスト実行
	$(COMPOSE) exec frontend npm test -- --watch=false || true

test-main: ## メインE2Eテスト実行（全API統合テスト）
	$(COMPOSE) exec backend npm test src/app.test.ts -- --watch=false || true

test-auth: ## 認証・ユーザー管理APIテスト実行
	$(COMPOSE) exec backend npm test src/controllers/auth.test.ts -- --watch=false || true

test-shared: ## 共有旅程アクセスAPIテスト実行
	$(COMPOSE) exec backend npm test src/controllers/sharedItineraryController.test.ts -- --watch=false || true

test-copy: ## 旅程複製・マイグレーションAPIテスト実行
	$(COMPOSE) exec backend npm test src/controllers/itineraryCopyController.test.ts -- --watch=false || true

test-password-reset: ## パスワードリセット機能テスト実行
	$(COMPOSE) exec backend npm test src/controllers/authController.test.ts -- --watch=false || true

# テスト実行オプション（詳細ログ付き）
test-verbose: ## 全テスト実行（詳細ログ付き）
	$(COMPOSE) exec backend npm test -- --watch=false --verbose || true
	$(COMPOSE) exec frontend npm test -- --watch=false --verbose || true

test-coverage: ## 全テスト実行（カバレッジ付き）
	$(COMPOSE) exec backend npm test -- --watch=false --coverage || true
	$(COMPOSE) exec frontend npm test -- --watch=false --coverage || true

# 特定のテストスイート実行
test-itinerary: ## 旅程関連APIテスト実行
	$(COMPOSE) exec backend npm test -- --testNamePattern="旅程管理API|旅程共有機能API|公開旅程アクセスAPI|旅程複製・マイグレーションAPI" --watch=false || true

test-user: ## ユーザー関連APIテスト実行
	$(COMPOSE) exec backend npm test -- --testNamePattern="ユーザー管理API|認証エンドポイント" --watch=false || true

# テスト実行例:
# make test                    # 全テスト実行
# make test-backend           # backendの全テスト
# make test-main              # メインE2Eテスト
# make test-auth              # 認証APIテスト
# make test-shared            # 共有旅程APIテスト
# make test-copy              # 複製・マイグレーションAPIテスト
# make test-verbose           # 詳細ログ付きテスト
# make test-coverage          # カバレッジ付きテスト

db-migrate: ## DBマイグレーション
	$(COMPOSE) exec backend npm run db:migrate

db-seed: ## 初期データ投入
	$(COMPOSE) exec backend npm run db:seed

db-reset-seed: ## データベースリセット + 初期データ投入
	@echo "データベースをリセットして初期データを投入します..."
	$(COMPOSE) exec backend npx prisma migrate reset --force
	$(COMPOSE) exec backend npm run db:seed
	@echo "データベースリセットとシードが完了しました"

db-studio: ## Prisma Studio起動
	$(COMPOSE) exec backend npx prisma studio

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

deploy: ## デプロイNoop（後で差し替え）
	@echo "Deploy to $(ENV) - TODO"

init: ## 初回セットアップ（DBマイグレーション + シード）
	$(COMPOSE) up -d
	@echo "データベースの初期化を待機中..."
	@sleep 10
	$(COMPOSE) exec backend npm run db:migrate
	$(COMPOSE) exec backend npm run db:seed
