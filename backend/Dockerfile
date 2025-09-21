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

# Prismaスキーマファイルを先にコピー
COPY prisma ./prisma

# Prismaクライアント生成
RUN npx prisma generate

# アプリ本体コピー
COPY . .

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

# Prismaスキーマファイルを先にコピー
COPY prisma ./prisma

# Prismaクライアント生成
RUN npx prisma generate

# アプリ本体コピー
COPY . .

# TypeScriptビルド（詳細ログ付き）
RUN npm run build || (echo "Build failed, showing TypeScript errors:" && npx tsc --noEmit)

# ビルド結果を確認
RUN ls -la dist/ && echo "Build completed successfully"

# ===== 本番実行ステージ =====
# OPTIMIZE: 必要に応じて node:22-alpine や distroless を使用し、さらに軽量化できる。
FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

# ビルドに必要なツールを入れる（最小限）
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    netcat-openbsd \
  && rm -rf /var/lib/apt/lists/*

# パッケージインストール（本番用のみ）
COPY package.json package-lock.json ./
# npm v9+ は --only=production より --omit=dev を推奨
RUN npm ci --omit=dev

# Prismaスキーマファイルをコピー
COPY prisma ./prisma

# Prisma Client を本番 node_modules に対して確実に生成
RUN npx prisma generate

# ビルド済みファイルをコピー
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# スタートアップスクリプトを追加
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# 非特権ユーザーで実行するため、ファイルの所有者を変更
RUN chown -R node:node /app
USER node

# ビルド結果を確認
RUN ls -la dist/ && echo "Runtime stage: dist directory contents verified"
# Prisma Client 生成の検証（デバッグ用）
RUN ls -la node_modules/.prisma/client && echo "Prisma Client generated successfully"

# 本番用コマンド（entrypoint.shを実行してマイグレーション後にアプリを起動）
CMD ["sh", "/app/entrypoint.sh"]
