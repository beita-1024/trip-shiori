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

# パッケージインストール（devDependenciesも含む）
COPY package*.json ./
RUN NODE_ENV=development npm ci

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

# パッケージインストール（devDependenciesも含む）
COPY package*.json ./
RUN NODE_ENV=development npm ci

# アプリ本体コピー
COPY . .

# Prismaクライアント生成
RUN npx prisma generate

# TypeScriptビルド
RUN npm run build

# ===== 本番実行ステージ =====
FROM node:22-bookworm-slim AS runtime

WORKDIR /app

# ビルドに必要なツールを入れる（最小限）
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    netcat-openbsd \
  && rm -rf /var/lib/apt/lists/*

# パッケージインストール（本番用のみ）
COPY package*.json ./
RUN NODE_ENV=production npm ci --only=production

# ビルド済みファイルをコピー
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# スタートアップスクリプトを追加
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# 本番用コマンド
CMD ["node", "dist/app.js"]
