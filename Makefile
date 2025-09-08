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
  db-migrate \
  db-seed \
  db-studio \
  deploy

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

test: ## まとめてtest
	$(COMPOSE) exec backend npm test -- --watch=false || true
	$(COMPOSE) exec frontend npm test -- --watch=false || true

db-migrate: ## DBマイグレーション
	$(COMPOSE) exec backend npm run db:migrate

db-seed: ## 初期データ投入
	$(COMPOSE) exec backend npm run db:seed

db-studio: ## Prisma Studio起動
	$(COMPOSE) exec backend npx prisma studio

deploy: ## デプロイNoop（後で差し替え）
	@echo "Deploy to $(ENV) - TODO"
