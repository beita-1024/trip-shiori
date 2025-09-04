FROM node:20-bullseye-slim

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


# パッケージインストール
COPY package*.json ./
RUN npm install

# アプリ本体コピー
COPY . .

# Prismaクライアント生成（※ DBに接続しないのでここでも可）
RUN npx prisma generate

# TypeScriptビルド
RUN npm run build

# スタートアップスクリプトを追加
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# 開発用コマンド（DB起動待ち→ migrate dev → サーバ起動）
CMD ["sh", "/app/entrypoint.sh"]
