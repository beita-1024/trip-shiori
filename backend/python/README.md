# FastAPI Sidecar Service

FastAPI サイドカーサービス - trip-shiori backend の Python 処理を担当

## 機能

- ヘルスチェック API
- 足し算計算 API
- Express からの HTTP 呼び出し対応

## 起動方法

```bash
cd backend/python
poetry install
poetry run sh start.sh
```

## API エンドポイント

- `GET /health` - ヘルスチェック
- `POST /calc/add` - 足し算計算
