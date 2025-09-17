# ===== 開発ステージ =====
FROM node:22-bookworm-slim AS dev

WORKDIR /app

# 依存インストール（devDependenciesも含む）
COPY package*.json ./
RUN npm ci

# ソースをコピー
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]

# ===== ビルドステージ =====
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# 依存インストール（devDependenciesも含む）
COPY package*.json ./
RUN npm ci

# ソースをコピー
COPY . .

# Next.jsアプリケーションをビルド
RUN npm run build

# ===== 本番実行ステージ =====
FROM node:22-bookworm-slim AS runtime

WORKDIR /app

# 本番用依存関係のみインストール
COPY package*.json ./
RUN npm ci --only=production

# ビルド済みファイルをコピー
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "run", "start"]
