# ===== 開発ステージ =====
FROM node:22-bookworm-slim AS dev

WORKDIR /app

# ビルドに必要なツールを入れる
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
    netcat-openbsd \
  && rm -rf /var/lib/apt/lists/*

# npmを最新版に更新
RUN npm install -g npm@latest

# パッケージインストール（devDependenciesも含む）
COPY package.json package-lock.json ./
RUN NODE_ENV=development npm install

# アプリ本体コピー
COPY . .

# Prismaクライアント生成
RUN npx prisma generate

# スタートアップスクリプトを追加
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# 開発用コマンド（DB起動待ち→ migrate dev → サーバ起動）
CMD ["sh", "/app/entrypoint.sh"]

# ===== ビルドステージ =====
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# ビルドに必要なツールを入れる
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# npmを最新版に更新
RUN npm install -g npm@latest

# パッケージインストール（devDependenciesも含む）
COPY package.json package-lock.json ./
RUN NODE_ENV=development npm install

# アプリ本体コピー
COPY . .

# Prismaクライアント生成
RUN npx prisma generate

# TypeScriptビルド（詳細ログ付き）
RUN npm run build || (echo "Build failed, showing TypeScript errors:" && npx tsc --noEmit)

# ビルド結果を確認
RUN ls -la dist/ && echo "Build completed successfully"

# ===== 本番実行ステージ =====
# OPTIMIZE: 必要に応じて node:22-alpine や distroless を使用し、さらに軽量化できる。
FROM node:22-bookworm-slim AS runtime

WORKDIR /app

# ビルドに必要なツールを入れる（最小限）
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    netcat-openbsd \
  && rm -rf /var/lib/apt/lists/*

# パッケージインストール（本番用のみ）
COPY package.json package-lock.json ./
RUN NODE_ENV=production npm ci --only=production

# ビルド済みファイルをコピー
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# スタートアップスクリプトを追加
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# ビルド結果を確認
RUN ls -la dist/ && echo "Runtime stage: dist directory contents verified"

# 本番用コマンド（entrypoint.shを実行してマイグレーション後にアプリを起動）
CMD ["sh", "/app/entrypoint.sh"]
