# ===== Config =====
COMPOSE ?= docker compose
SERVICES ?= backend frontend
ENV ?= dev
# 例) make deploy-cap

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
  deploy-cap \
  init \
  generate-favicons \
  optimize-svgs

# Makefile内の "##" コメント付きコマンド一覧を色付きで表示
help: ## コマンド一覧
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' Makefile \
		| awk 'BEGIN {FS=":.*?## "}; { \
			printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2 \
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

.PHONY: deploy-cap-frontend deploy-cap-backend deploy-cap

# Frontend デプロイ
deploy-cap-frontend: ## CapRoverへ frontend をデプロイ
	$(call _deploy_cap,$(CAPROVER_TOKEN_FE),$(CAPROVER_APP_FE))

# Backend デプロイ
deploy-cap-backend: ## CapRoverへ backend をデプロイ
	$(call _deploy_cap,$(CAPROVER_TOKEN_BE),$(CAPROVER_APP_BE))

# 両方デプロイ（Backend → Frontend の順序）
deploy-cap: deploy-cap-backend deploy-cap-frontend ## 両方デプロイ（Backend → Frontend）

# ===== Terraform + GCP デプロイ設定 =====
# 環境変数
TF_ENV ?= dev
TF_DIR = terraform/environments/$(TF_ENV)
GCP_PROJECT = portfolio-472821
GCP_REGION = asia-northeast1

# Dockerイメージ設定（Git SHA方式）
GIT_SHA = $(shell git rev-parse --short HEAD)
BACKEND_IMAGE = gcr.io/$(GCP_PROJECT)/trip-shiori-backend:$(GIT_SHA)
FRONTEND_IMAGE = gcr.io/$(GCP_PROJECT)/trip-shiori-frontend:$(GIT_SHA)

.PHONY: \
  tf-init \
  tf-plan \
  tf-apply \
  tf-destroy \
  tf-output \
  tf-validate \
  gcp-auth \
  docker-build \
  docker-push \
  deploy-gcp-dev \
  deploy-gcp-prod \
  deploy-gcp-full \
  destroy-gcp-dev \
  destroy-gcp-prod \
  destroy-gcp

# ===== Terraform基本操作 =====
tf-init: ## Terraform初期化
	@echo "Terraform（$(TF_ENV)環境）の初期化を実行します..."
	cd $(TF_DIR) && terraform init

tf-validate: ## Terraform設定の検証
	@echo "Terraform設定の検証を実行します..."
	cd $(TF_DIR) && terraform validate

tf-plan: ## Terraformプラン実行
	@echo "Terraformプラン（$(TF_ENV)環境）の作成を実行します..."
	cd $(TF_DIR) && terraform plan

tf-apply: ## Terraform適用
	@echo "Terraform構成（$(TF_ENV)環境）の適用を実行します..."
	cd $(TF_DIR) && terraform apply -auto-approve

tf-destroy: ## Terraformリソース削除
	@echo "Terraformリソース（$(TF_ENV)環境）の削除を実行します..."
	cd $(TF_DIR) && terraform destroy

tf-output: ## Terraform出力表示
	@echo "Terraform出力（$(TF_ENV)環境）:"
	cd $(TF_DIR) && terraform output

# ===== GCP認証 =====
gcp-auth: ## GCP認証設定
	@echo "GCP認証を設定します..."
	gcloud auth login
	gcloud config set project $(GCP_PROJECT)
	gcloud auth configure-docker

# ===== Docker操作 =====
docker-build: ## Dockerイメージビルド（Git SHA方式）
	@echo "Dockerイメージをビルドします（Git SHA: $(GIT_SHA)）..."
	docker build -t $(BACKEND_IMAGE) ./backend
	docker build -t $(FRONTEND_IMAGE) ./frontend

docker-build-with-env: ## 環境変数付きでDockerイメージビルド（Git SHA方式）
	@echo "環境変数付きでDockerイメージをビルドします（Git SHA: $(GIT_SHA)）..."
	docker build -t $(BACKEND_IMAGE) ./backend || (echo "❌ バックエンドイメージのビルドに失敗しました" && exit 1)
	@echo "フロントエンドの環境変数を設定中..."
	@$(eval BACKEND_URL := $(if $(filter prod,$(TF_ENV)),https://api.trip.beita.dev,$(if $(filter dev,$(TF_ENV)),https://dev-api.trip.beita.dev,https://$(TF_ENV)-api.trip.beita.dev)))
	@$(eval FRONTEND_URL := $(if $(filter prod,$(TF_ENV)),https://app.trip.beita.dev,$(if $(filter dev,$(TF_ENV)),https://dev-app.trip.beita.dev,https://$(TF_ENV)-app.trip.beita.dev)))
	@echo "Backend URL: $(BACKEND_URL)"
	@echo "Frontend URL: $(FRONTEND_URL)"
	docker build \
		--build-arg NEXT_PUBLIC_API_URL="$(BACKEND_URL)" \
		--build-arg NEXT_PUBLIC_FRONTEND_URL="$(FRONTEND_URL)" \
		--build-arg NEXT_PUBLIC_APP_NAME="Trip Shiori" \
		--build-arg NEXT_PUBLIC_VERSION="1.0.0" \
		--build-arg NEXT_PUBLIC_DEBUG="false" \
		-t $(FRONTEND_IMAGE) ./frontend || (echo "❌ フロントエンドイメージのビルドに失敗しました" && exit 1)

docker-push: ## Dockerイメージプッシュ（Git SHA方式）
	@echo "DockerイメージをGCRへプッシュします（Git SHA: $(GIT_SHA)）..."
	docker push $(BACKEND_IMAGE)
	docker push $(FRONTEND_IMAGE)

# ===== 統合デプロイ =====
deploy-gcp-dev: ## GCP開発環境デプロイ
	@echo "GCP開発環境へデプロイを開始します..."
	$(MAKE) tf-init TF_ENV=dev
	$(MAKE) tf-validate TF_ENV=dev
	$(MAKE) tf-plan TF_ENV=dev
	@echo "⚠️  変更内容を確認してください。続行するには 'yes' と入力してください:"
	@read confirm && [ "$$confirm" = "yes" ] || (echo "デプロイがキャンセルされました" && exit 1)
	$(MAKE) tf-apply TF_ENV=dev
	@echo "開発環境へのデプロイが完了しました"

deploy-gcp-dev-full: ## GCP開発環境フルデプロイ（環境変数付きビルド）
	@echo "GCP開発環境へのフルデプロイを開始します..."
	@echo "Git SHA: $(GIT_SHA)"
	@echo "1/6: Terraform初期化..."
	$(MAKE) tf-init TF_ENV=dev || (echo "❌ Terraform初期化に失敗しました" && exit 1)
	@echo "2/6: Terraform設定検証..."
	$(MAKE) tf-validate TF_ENV=dev || (echo "❌ Terraform設定検証に失敗しました" && exit 1)
	@echo "3/6: 環境変数付きでDockerイメージをビルドします..."
	$(MAKE) docker-build-with-env TF_ENV=dev || (echo "❌ Dockerイメージビルドに失敗しました" && exit 1)
	@echo "4/6: Dockerイメージをプッシュします..."
	$(MAKE) docker-push || (echo "❌ Dockerイメージプッシュに失敗しました" && exit 1)
	@echo "5/6: Terraformプランを実行します..."
	$(MAKE) tf-plan TF_ENV=dev || (echo "❌ Terraformプランに失敗しました" && exit 1)
	@echo "⚠️  変更内容を確認してください。続行するには 'yes' と入力してください:"
	@read confirm && [ "$$confirm" = "yes" ] || (echo "デプロイがキャンセルされました" && exit 1)
	@echo "6/6: Terraformを適用します..."
	$(MAKE) tf-apply TF_ENV=dev || (echo "❌ Terraform適用に失敗しました" && exit 1)
	@echo "✅ フルデプロイが完了しました"

deploy-gcp-prod: ## GCP本番環境デプロイ
	@echo "GCP本番環境へデプロイを開始します..."
	$(MAKE) tf-init TF_ENV=prod
	$(MAKE) tf-validate TF_ENV=prod
	$(MAKE) tf-plan TF_ENV=prod
	@echo "⚠️  本番環境の変更内容を確認してください。続行するには 'yes' と入力してください:"
	@read confirm && [ "$$confirm" = "yes" ] || (echo "デプロイがキャンセルされました" && exit 1)
	$(MAKE) tf-apply TF_ENV=prod
	@echo "本番環境へのデプロイが完了しました"

deploy-gcp-prod-full: ## GCP本番環境フルデプロイ（環境変数付きビルド）
	@echo "GCP本番環境へのフルデプロイを開始します..."
	@echo "Git SHA: $(GIT_SHA)"
	@echo "1/6: Terraform初期化..."
	$(MAKE) tf-init TF_ENV=prod || (echo "❌ Terraform初期化に失敗しました" && exit 1)
	@echo "2/6: Terraform設定検証..."
	$(MAKE) tf-validate TF_ENV=prod || (echo "❌ Terraform設定検証に失敗しました" && exit 1)
	@echo "3/6: 環境変数付きでDockerイメージをビルドします..."
	$(MAKE) docker-build-with-env TF_ENV=prod || (echo "❌ Dockerイメージビルドに失敗しました" && exit 1)
	@echo "4/6: Dockerイメージをプッシュします..."
	$(MAKE) docker-push || (echo "❌ Dockerイメージプッシュに失敗しました" && exit 1)
	@echo "5/6: Terraformプランを実行します..."
	$(MAKE) tf-plan TF_ENV=prod || (echo "❌ Terraformプランに失敗しました" && exit 1)
	@echo "⚠️  本番環境の変更内容を確認してください。続行するには 'yes' と入力してください:"
	@read confirm && [ "$$confirm" = "yes" ] || (echo "デプロイがキャンセルされました" && exit 1)
	@echo "6/6: Terraformを適用します..."
	$(MAKE) tf-apply TF_ENV=prod || (echo "❌ Terraform適用に失敗しました" && exit 1)
	@echo "✅ 本番環境フルデプロイが完了しました"

deploy-gcp-full: ## フルデプロイ（環境変数付きビルド→プッシュ→Terraform適用）
	@echo "GCPへのフルデプロイを開始します..."
	@echo "Git SHA: $(GIT_SHA)"
	$(MAKE) gcp-auth
	$(MAKE) tf-init TF_ENV=$(TF_ENV)
	$(MAKE) tf-validate TF_ENV=$(TF_ENV)
	@echo "環境変数付きでDockerイメージをビルドします..."
	$(MAKE) docker-build-with-env TF_ENV=$(TF_ENV)
	@echo "Dockerイメージをプッシュします..."
	$(MAKE) docker-push
	@echo "Terraformプランを実行します..."
	$(MAKE) tf-plan TF_ENV=$(TF_ENV)
	@echo "⚠️  変更内容を確認してください。続行するには 'yes' と入力してください:"
	@read confirm && [ "$$confirm" = "yes" ] || (echo "デプロイがキャンセルされました" && exit 1)
	@echo "Terraformを適用します..."
	$(MAKE) tf-apply TF_ENV=$(TF_ENV)
	@echo "フルデプロイが完了しました"

# ===== リソース削除 =====
destroy-gcp-dev: ## GCP開発環境リソース削除
	@echo "GCP開発環境のリソース削除を開始します..."
	@echo "⚠️  警告: この操作は開発環境のすべてのリソースを削除します"
	@echo "続行するには 'yes' と入力してください:"
	@read confirm && [ "$$confirm" = "yes" ] || (echo "操作がキャンセルされました" && exit 1)
	$(MAKE) tf-destroy TF_ENV=dev
	@echo "開発環境のリソース削除が完了しました"

destroy-gcp-prod: ## GCP本番環境リソース削除
	@echo "GCP本番環境のリソース削除を開始します..."
	@echo "⚠️  警告: この操作は本番環境のすべてのリソースを削除します"
	@echo "⚠️  注意: データベースのデータも失われます"
	@echo "続行するには 'yes' と入力してください:"
	@read confirm && [ "$$confirm" = "yes" ] || (echo "操作がキャンセルされました" && exit 1)
	$(MAKE) tf-destroy TF_ENV=prod
	@echo "本番環境のリソース削除が完了しました"

destroy-gcp: ## GCP環境リソース削除（環境指定）
	@echo "GCP環境（$(TF_ENV)）のリソース削除を開始します..."
	@echo "⚠️  警告: この操作は$(TF_ENV)環境のすべてのリソースを削除します"
	@echo "続行するには 'yes' と入力してください:"
	@read confirm && [ "$$confirm" = "yes" ] || (echo "操作がキャンセルされました" && exit 1)
	$(MAKE) tf-destroy TF_ENV=$(TF_ENV)
	@echo "$(TF_ENV)環境のリソース削除が完了しました"

generate-favicons: ## SVGからfaviconとPWAアイコンを生成
	@echo "faviconとPWAアイコンを生成中..."
	@./scripts/generate-favicons.sh
	@echo "favicon生成が完了しました"

optimize-svgs: ## docs/ux/design/orgの全SVGファイルを最適化してoptimizedディレクトリに出力
	@echo "SVGファイルを最適化中..."
	@mkdir -p docs/ux/design/optimized
	@if [ -d "docs/ux/design/org" ] && [ "$$(ls -A docs/ux/design/org/*.svg 2>/dev/null)" ]; then \
		for svg_file in docs/ux/design/org/*.svg; do \
			if [ -f "$$svg_file" ]; then \
				filename=$$(basename "$$svg_file"); \
				echo "最適化中: $$filename"; \
				npx --yes svgo --config=docs/ux/design/svgo.config.mjs "$$svg_file" -o "docs/ux/design/optimized/$$filename"; \
			fi; \
		done; \
		echo "SVG最適化が完了しました"; \
	else \
		echo "docs/ux/design/orgディレクトリにSVGファイルが見つかりません"; \
	fi

# ===== GCP Cloud Run ログ取得 =====
logs-gcp-frontend: ## GCP Cloud Run フロントエンドのログ取得
	@echo "Cloud Run フロントエンドのログを取得します..."
	gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=trip-shiori-$(TF_ENV)-frontend" \
		--project=$(GCP_PROJECT) \
		--limit=50 \
		--format="table(timestamp,severity,textPayload)"

logs-gcp-backend: ## GCP Cloud Run バックエンドのログ取得
	@echo "Cloud Run バックエンドのログを取得します..."
	gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=trip-shiori-$(TF_ENV)-backend" \
		--project=$(GCP_PROJECT) \
		--limit=50 \
		--format="table(timestamp,severity,textPayload)"

logs-gcp: logs-gcp-frontend logs-gcp-backend ## GCP Cloud Run 全サービスのログ取得

# ===== CloudFlare DNS設定 =====
# ドメイン設定
DEV_FRONTEND_DOMAIN = dev-app.trip.beita.dev
DEV_BACKEND_DOMAIN = dev-api.trip.beita.dev
PROD_FRONTEND_DOMAIN = app.trip.beita.dev
PROD_BACKEND_DOMAIN = api.trip.beita.dev

# 動的ドメイン取得関数
# 引数: $(1) = サービス名, $(2) = 環境
define _get_cloud_run_url
	@$(GCLOUD) run services describe $(1) --region=$(GCP_REGION) --format='value(status.url)' 2>/dev/null || echo "サービス $(1) が見つかりません"
endef

# 環境別のCloud Run URL取得
get-dev-frontend-url: ## 開発環境フロントエンドのCloud Run URL取得
	@$(call _get_cloud_run_url,$(DEV_FRONTEND_SERVICE),dev)

get-dev-backend-url: ## 開発環境バックエンドのCloud Run URL取得
	@$(call _get_cloud_run_url,$(DEV_BACKEND_SERVICE),dev)

get-prod-frontend-url: ## 本番環境フロントエンドのCloud Run URL取得
	@$(call _get_cloud_run_url,$(PROD_FRONTEND_SERVICE),prod)

get-prod-backend-url: ## 本番環境バックエンドのCloud Run URL取得
	@$(call _get_cloud_run_url,$(PROD_BACKEND_SERVICE),prod)

.PHONY: \
  dns-info-dev \
  dns-info-prod \
  dns-info \
  get-dev-frontend-url \
  get-dev-backend-url \
  get-prod-frontend-url \
  get-prod-backend-url

# ===== Cloud Run ドメインマッピング =====
# Cloud Runサービス名（環境別）
DEV_FRONTEND_SERVICE = trip-shiori-dev-frontend
DEV_BACKEND_SERVICE = trip-shiori-dev-backend
PROD_FRONTEND_SERVICE = trip-shiori-prod-frontend
PROD_BACKEND_SERVICE = trip-shiori-prod-backend

# gcloud設定
GCLOUD_TRACK ?= beta
GCLOUD ?= gcloud $(GCLOUD_TRACK)
GCP_REGION ?= asia-northeast1

.PHONY: \
  domain-mapping-create-dev \
  domain-mapping-create-prod \
  domain-mapping-create \
  domain-mapping-info-dev \
  domain-mapping-info-prod \
  domain-mapping-info \
  domain-mapping-status \
  domain-mapping-list

# 開発環境のDNS設定情報表示
dns-info-dev: ## 開発環境のDNS設定情報表示
	@echo "=== 開発環境のCloudFlare DNS設定情報 ==="
	@echo ""
	@echo "以下のCNAMEレコードをCloudFlareのDNS設定に追加してください："
	@echo ""
	@echo "フロントエンド:"
	@echo "  Type: CNAME"
	@echo "  Name: dev-app"
	@echo "  Target: $$($(GCLOUD) run services describe $(DEV_FRONTEND_SERVICE) --region=$(GCP_REGION) --format='value(status.url)' 2>/dev/null | sed 's|https://||')"
	@echo "  TTL: Auto"
	@echo ""
	@echo "バックエンド:"
	@echo "  Type: CNAME"
	@echo "  Name: dev-api"
	@echo "  Target: $$($(GCLOUD) run services describe $(DEV_BACKEND_SERVICE) --region=$(GCP_REGION) --format='value(status.url)' 2>/dev/null | sed 's|https://||')"
	@echo "  TTL: Auto"
	@echo ""
	@echo "CloudFlareの設定:"
	@echo "  SSL/TLS: Full (strict)"
	@echo "  Always Use HTTPS: ON"
	@echo "  HTTP/2: ON"
	@echo "  HTTP/3: ON"

# 本番環境のDNS設定情報表示
dns-info-prod: ## 本番環境のDNS設定情報表示
	@echo "=== 本番環境のCloudFlare DNS設定情報 ==="
	@echo ""
	@echo "以下のCNAMEレコードをCloudFlareのDNS設定に追加してください："
	@echo ""
	@echo "フロントエンド:"
	@echo "  Type: CNAME"
	@echo "  Name: app"
	@echo "  Target: $$($(GCLOUD) run services describe $(PROD_FRONTEND_SERVICE) --region=$(GCP_REGION) --format='value(status.url)' 2>/dev/null | sed 's|https://||')"
	@echo "  TTL: Auto"
	@echo ""
	@echo "バックエンド:"
	@echo "  Type: CNAME"
	@echo "  Name: api"
	@echo "  Target: $$($(GCLOUD) run services describe $(PROD_BACKEND_SERVICE) --region=$(GCP_REGION) --format='value(status.url)' 2>/dev/null | sed 's|https://||')"
	@echo "  TTL: Auto"
	@echo ""
	@echo "CloudFlareの設定:"
	@echo "  SSL/TLS: Full (strict)"
	@echo "  Always Use HTTPS: ON"
	@echo "  HTTP/2: ON"
	@echo "  HTTP/3: ON"

# 環境別のDNS設定情報表示
dns-info: ## 環境別のDNS設定情報表示
	@if [ "$(TF_ENV)" = "dev" ]; then \
		$(MAKE) dns-info-dev; \
	elif [ "$(TF_ENV)" = "prod" ]; then \
		$(MAKE) dns-info-prod; \
	else \
		echo "エラー: TF_ENVは 'dev' または 'prod' を指定してください"; \
		exit 1; \
	fi

# ===== Cloud Run ドメインマッピング実装 =====

# 開発環境のドメインマッピング作成
# 参考：https://cloud.google.com/run/docs/mapping-custom-domains?hl=ja#gcloud
domain-mapping-create-dev: ## 開発環境のCloud Runドメインマッピング作成
	@echo "開発環境のドメインマッピングを作成します..."
	@echo "フロントエンド: $(DEV_FRONTEND_DOMAIN) -> $(DEV_FRONTEND_SERVICE)"
	@echo "バックエンド: $(DEV_BACKEND_DOMAIN) -> $(DEV_BACKEND_SERVICE)"
	@echo ""
	@echo "フロントエンドのドメインマッピングを作成中..."
	@$(GCLOUD) run domain-mappings create \
		--service=$(DEV_FRONTEND_SERVICE) \
		--domain=$(DEV_FRONTEND_DOMAIN) \
		--region=$(GCP_REGION)
	@echo ""
	@echo "バックエンドのドメインマッピングを作成中..."
	@$(GCLOUD) run domain-mappings create \
		--service=$(DEV_BACKEND_SERVICE) \
		--domain=$(DEV_BACKEND_DOMAIN) \
		--region=$(GCP_REGION)
	@echo ""
	@echo "✅ 開発環境のドメインマッピング作成が完了しました"
	@echo "次のステップ: make domain-mapping-info-dev でDNS設定情報を確認してください"

# 本番環境のドメインマッピング作成
domain-mapping-create-prod: ## 本番環境のCloud Runドメインマッピング作成
	@echo "本番環境のドメインマッピングを作成します..."
	@echo "フロントエンド: $(PROD_FRONTEND_DOMAIN) -> $(PROD_FRONTEND_SERVICE)"
	@echo "バックエンド: $(PROD_BACKEND_DOMAIN) -> $(PROD_BACKEND_SERVICE)"
	@echo ""
	@echo "フロントエンドのドメインマッピングを作成中..."
	@$(GCLOUD) run domain-mappings create \
		--service=$(PROD_FRONTEND_SERVICE) \
		--domain=$(PROD_FRONTEND_DOMAIN) \
		--region=$(GCP_REGION)
	@echo ""
	@echo "バックエンドのドメインマッピングを作成中..."
	@$(GCLOUD) run domain-mappings create \
		--service=$(PROD_BACKEND_SERVICE) \
		--domain=$(PROD_BACKEND_DOMAIN) \
		--region=$(GCP_REGION)
	@echo ""
	@echo "✅ 本番環境のドメインマッピング作成が完了しました"
	@echo "次のステップ: make domain-mapping-info-prod でDNS設定情報を確認してください"

# 環境別のドメインマッピング作成
domain-mapping-create: ## 環境別のCloud Runドメインマッピング作成
	@if [ "$(TF_ENV)" = "dev" ]; then \
		$(MAKE) domain-mapping-create-dev; \
	elif [ "$(TF_ENV)" = "prod" ]; then \
		$(MAKE) domain-mapping-create-prod; \
	else \
		echo "エラー: TF_ENVは 'dev' または 'prod' を指定してください"; \
		exit 1; \
	fi

# 開発環境のDNS設定情報表示
domain-mapping-info-dev: ## 開発環境のドメインマッピングDNS設定情報表示
	@echo "=== 開発環境のCloud RunドメインマッピングDNS設定情報 ==="
	@echo ""
	@echo "フロントエンド ($(DEV_FRONTEND_DOMAIN)):"
	@echo "必要なDNSレコード:"
	@$(GCLOUD) run domain-mappings describe \
		--domain=$(DEV_FRONTEND_DOMAIN) \
		--region=$(GCP_REGION) \
		--format='table(status.resourceRecords[].type,status.resourceRecords[].name,status.resourceRecords[].rrdata)' \
	|| echo "ドメインマッピングが見つかりません。先に make domain-mapping-create-dev を実行してください"
	@echo ""
	@echo "バックエンド ($(DEV_BACKEND_DOMAIN)):"
	@echo "必要なDNSレコード:"
	@$(GCLOUD) run domain-mappings describe \
		--domain=$(DEV_BACKEND_DOMAIN) \
		--region=$(GCP_REGION) \
		--format='table(status.resourceRecords[].type,status.resourceRecords[].name,status.resourceRecords[].rrdata)' \
	|| echo "ドメインマッピングが見つかりません。先に make domain-mapping-create-dev を実行してください"
	@echo ""
	@echo "CloudFlareの設定:"
	@echo "  SSL/TLS: Full (strict)"
	@echo "  Always Use HTTPS: ON"
	@echo "  HTTP/2: ON"
	@echo "  HTTP/3: ON"
	@echo "  Proxy: 最初はOFF（DNS only）→ 証明書ACTIVE後にON"

# 本番環境のDNS設定情報表示
domain-mapping-info-prod: ## 本番環境のドメインマッピングDNS設定情報表示
	@echo "=== 本番環境のCloud RunドメインマッピングDNS設定情報 ==="
	@echo ""
	@echo "フロントエンド ($(PROD_FRONTEND_DOMAIN)):"
	@echo "必要なDNSレコード:"
	@$(GCLOUD) run domain-mappings describe \
		--domain=$(PROD_FRONTEND_DOMAIN) \
		--region=$(GCP_REGION) \
		--format='table(status.resourceRecords[].type,status.resourceRecords[].name,status.resourceRecords[].rrdata)' \
	|| echo "ドメインマッピングが見つかりません。先に make domain-mapping-create-prod を実行してください"
	@echo ""
	@echo "バックエンド ($(PROD_BACKEND_DOMAIN)):"
	@echo "必要なDNSレコード:"
	@$(GCLOUD) run domain-mappings describe \
		--domain=$(PROD_BACKEND_DOMAIN) \
		--region=$(GCP_REGION) \
		--format='table(status.resourceRecords[].type,status.resourceRecords[].name,status.resourceRecords[].rrdata)' \
	|| echo "ドメインマッピングが見つかりません。先に make domain-mapping-create-prod を実行してください"
	@echo ""
	@echo "CloudFlareの設定:"
	@echo "  SSL/TLS: Full (strict)"
	@echo "  Always Use HTTPS: ON"
	@echo "  HTTP/2: ON"
	@echo "  HTTP/3: ON"
	@echo "  Proxy: 最初はOFF（DNS only）→ 証明書ACTIVE後にON"

# 環境別のDNS設定情報表示
domain-mapping-info: ## 環境別のドメインマッピングDNS設定情報表示
	@if [ "$(TF_ENV)" = "dev" ]; then \
		$(MAKE) domain-mapping-info-dev; \
	elif [ "$(TF_ENV)" = "prod" ]; then \
		$(MAKE) domain-mapping-info-prod; \
	else \
		echo "エラー: TF_ENVは 'dev' または 'prod' を指定してください"; \
		exit 1; \
	fi

# ドメインマッピング状態確認
domain-mapping-status: ## ドメインマッピングの状態確認
	@echo "=== Cloud Runドメインマッピング状態確認 ==="
	@echo ""
	@echo "開発環境:"
	@echo "フロントエンド ($(DEV_FRONTEND_DOMAIN)):"
	@$(GCLOUD) run domain-mappings describe \
		--domain=$(DEV_FRONTEND_DOMAIN) \
		--region=$(GCP_REGION) \
		--format='value(status.conditions[].type,status.conditions[].status,status.conditions[].message)' || echo "ドメインマッピングが見つかりません"
	@echo ""
	@echo "バックエンド ($(DEV_BACKEND_DOMAIN)):"
	@$(GCLOUD) run domain-mappings describe \
		--domain=$(DEV_BACKEND_DOMAIN) \
		--region=$(GCP_REGION) \
		--format='value(status.conditions[].type,status.conditions[].status,status.conditions[].message)' || echo "ドメインマッピングが見つかりません"
	@echo ""
	@echo "本番環境:"
	@echo "フロントエンド ($(PROD_FRONTEND_DOMAIN)):"
	@$(GCLOUD) run domain-mappings describe \
		--domain=$(PROD_FRONTEND_DOMAIN) \
		--region=$(GCP_REGION) \
		--format='value(status.conditions[].type,status.conditions[].status,status.conditions[].message)' || echo "ドメインマッピングが見つかりません"
	@echo ""
	@echo "バックエンド ($(PROD_BACKEND_DOMAIN)):"
	@$(GCLOUD) run domain-mappings describe \
		--domain=$(PROD_BACKEND_DOMAIN) \
		--region=$(GCP_REGION) \
		--format='value(status.conditions[].type,status.conditions[].status,status.conditions[].message)' || echo "ドメインマッピングが見つかりません"

# ドメインマッピング一覧表示
domain-mapping-list: ## 全ドメインマッピングの一覧表示
	@echo "=== Cloud Runドメインマッピング一覧 ==="
	@$(GCLOUD) run domain-mappings list --region=$(GCP_REGION) --format='table(metadata.name,spec.routeName,status.conditions[].type,status.conditions[].status)'
