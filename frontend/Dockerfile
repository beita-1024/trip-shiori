FROM node:22-bookworm-slim

WORKDIR /app

# 依存インストール（lockfileがあれば npm ci 推奨）
COPY package*.json ./
# RUN npm ci
RUN npm install

# ソースをコピー
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
