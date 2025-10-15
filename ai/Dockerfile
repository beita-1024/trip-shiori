FROM python:3.11-slim-bookworm

WORKDIR /app

# 必要なツールをインストール
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    curl \
  && rm -rf /var/lib/apt/lists/*

# Poetryインストール
RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH="/root/.local/bin:$PATH"

# Poetryの設定（仮想環境をプロジェクト内に作成）
RUN poetry config virtualenvs.in-project true

# 依存関係ファイルをコピー
COPY pyproject.toml poetry.lock ./

# 依存関係のみインストール（プロジェクトはインストールしない）
RUN poetry install --only=main --no-root

# アプリケーションコードをコピー
COPY . .

# ポート3000で起動
EXPOSE 3000

# 開発環境用コマンド
CMD ["poetry", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3000", "--reload"]
