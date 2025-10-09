# ===== 開発ステージ =====
FROM node:22-bookworm-slim AS dev

WORKDIR /app

# ビルドに必要なツールを入れる
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    make \
    g++ \
    ca-certificates \
    netcat-openbsd \
    curl \
  && rm -rf /var/lib/apt/lists/*

# Poetry インストール
RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH="/root/.local/bin:$PATH"

# npmを最新版に更新
RUN npm install -g npm@latest

# パッケージインストール（devDependenciesも含む）
COPY package.json ./
COPY package-lock.json* ./
RUN NODE_ENV=development npm install

# Prismaスキーマファイルを先にコピー
COPY prisma ./prisma

# Prismaクライアント生成
RUN npx prisma generate

# アプリ本体コピー
COPY . .

# Python 依存関係インストール
RUN cd python && poetry install

# スタートアップスクリプトを追加
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Pythonスクリプトの権限設定
RUN chmod +x /app/python/start.sh

# 開発用コマンド（DB起動待ち→ migrate dev → サーバ起動）
CMD ["sh", "/app/entrypoint.sh"]

# ===== ビルドステージ =====
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# ビルドに必要なツールを入れる
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    make \
    g++ \
    ca-certificates \
    curl \
  && rm -rf /var/lib/apt/lists/*

# Poetry インストール
RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH="/root/.local/bin:$PATH"

# npmを最新版に更新
RUN npm install -g npm@latest

# パッケージインストール（devDependenciesも含む）
COPY package.json ./
COPY package-lock.json* ./
RUN NODE_ENV=development npm install

# Prismaスキーマファイルを先にコピー
COPY prisma ./prisma

# Prismaクライアント生成
RUN npx prisma generate

# アプリ本体コピー
COPY . .

# Python 依存関係インストール
RUN cd python && poetry install

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
    python3 \
    python3-pip \
    python3-venv \
    ca-certificates \
    netcat-openbsd \
    curl \
  && rm -rf /var/lib/apt/lists/*

# Poetry インストール
RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH="/root/.local/bin:$PATH"

# パッケージインストール（本番用のみ）
COPY package.json ./
COPY package-lock.json* ./
# npm v9+ は --only=production より --omit=dev を推奨
RUN npm ci --omit=dev

# Prismaスキーマファイルをコピー
COPY prisma ./prisma

# Prisma Client を本番 node_modules に対して確実に生成
RUN npx prisma generate

# ビルド済みファイルをコピー
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/python ./python

# Python 依存関係インストール（本番用のみ）
RUN cd python && poetry install --only=main

# スタートアップスクリプトを追加
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Pythonスクリプトの権限設定
RUN chmod +x /app/python/start.sh

# 非特権ユーザーで実行するため、ファイルの所有者を変更
RUN chown -R node:node /app
# 本番環境ではrootユーザーで実行（Poetryとts-nodeの権限問題を回避）
# USER node

# ビルド結果を確認
RUN ls -la dist/ && echo "Runtime stage: dist directory contents verified"
# Prisma Client 生成の検証（デバッグ用）
RUN ls -la node_modules/.prisma/client && echo "Prisma Client generated successfully"

# 本番用コマンド（entrypoint.shを実行してマイグレーション後にアプリを起動）
CMD ["sh", "/app/entrypoint.sh"]
