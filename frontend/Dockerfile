# ===== 開発ステージ =====
FROM node:22-bookworm-slim AS dev

WORKDIR /app

# 依存インストール（devDependenciesも含む）
COPY package*.json ./
RUN npm ci

# ソースをコピー
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", "3000"]

# ===== ビルドステージ =====
# OPTIMIZE: 必要に応じて node:22-alpine や distroless を使用し、さらに軽量化できる。
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# 依存インストール（devDependenciesも含む）
COPY package*.json ./
RUN npm ci

# ソースをコピー
COPY . .

# NOTE: Next.jsでは、NEXT_PUBLIC_で始まる環境変数はビルド時に埋め込まれまれるので
# ビルド時に環境変数を設定する。

# 環境変数をビルド時に設定
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_FRONTEND_URL
ARG NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_VERSION
ARG NEXT_PUBLIC_DEBUG

# 環境変数を設定
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_FRONTEND_URL=$NEXT_PUBLIC_FRONTEND_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_VERSION=$NEXT_PUBLIC_VERSION
ENV NEXT_PUBLIC_DEBUG=$NEXT_PUBLIC_DEBUG

# Next.jsアプリケーションをビルド
RUN npm run build

# ===== 本番実行ステージ =====
FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

# 本番用依存関係のみインストール
COPY package*.json ./
RUN npm ci --only=production

# ビルド済みファイルをコピー
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/package.json ./package.json

# 非特権ユーザーで実行するため、ファイルの所有者を変更
RUN chown -R node:node /app
USER node

# 環境変数の確認（デバッグ用）
RUN echo "Environment Variables:" && env | grep NEXT_PUBLIC || echo "No NEXT_PUBLIC variables found"

EXPOSE 3000
CMD ["npm", "run", "start", "--", "-H", "0.0.0.0", "-p", "3000"]
