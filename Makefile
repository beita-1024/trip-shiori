# ===== Config =====
COMPOSE ?= docker compose
SERVICES ?= backend frontend
ENV ?= dev
# 例) make deploy ENV=stg

.DEFAULT_GOAL := help
.PHONY: help up down build logs ps sh-backend sh-frontend lint test db-migrate db-seed deploy

help: ## コマンド一覧
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS=":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

up: ## Compose起動（バックグラウンド）
	$(COMPOSE) up -d

down: ## 停止＆ネットワーク片付け
	$(COMPOSE) down

build: ## イメージビルド
	$(COMPOSE) build

logs: ## 全サービスのログ追跡
	$(COMPOSE) logs -f --tail=100

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

deploy: ## デプロイNoop（後で差し替え）
	@echo "Deploy to $(ENV) - TODO: GHCRタグ更新/CapRover CLI をここに"
