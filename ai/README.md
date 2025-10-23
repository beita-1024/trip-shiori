# AI Service (FastAPI + LangChain)

Trip ShioriのAI機能を提供するPythonサービスです。FastAPI + LangChain 0.3 + LangGraphを使用して、イベント補完と旅程編集のAI機能を実装しています。

## 技術スタック

- **Python 3.11**: 最新の型ヒント・パフォーマンス向上
- **FastAPI 0.109**: 軽量・高速・型安全なAPIフレームワーク
- **Pydantic 2.5**: 型安全なデータ検証・設定管理
- **LangChain 0.3**: LLMアプリケーション構築フレームワーク
- **LangGraph 0.6**: ReActエージェント・ツール統合
- **Tavily Search**: RAG用の検索API統合
- **Cerebras API**: 高速・低コストなLLM推論（優先）
- **OpenAI API**: フォールバック用LLM

## 環境変数

### 必須環境変数

```bash
# LLM設定（Cerebras優先）
CEREBRAS_API_KEY=your-cerebras-api-key
CEREBRAS_BASE_URL=https://api.cerebras.ai/v1
CEREBRAS_MODEL=gpt-oss-120b

# LLM設定（OpenAIフォールバック）
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_TEMPERATURE=0.3

# RAG機能
TAVILY_API_KEY=your-tavily-api-key
TAVILY_MAX_PER_RUN=3

# タイムアウト設定
LLM_TIMEOUT_SEC=60
```

### オプション環境変数

```bash
# デバッグ設定
DEBUG=false
LOG_LEVEL=INFO
```

## 起動方法

### 開発環境

```bash
# 依存関係インストール
poetry install

# 開発サーバー起動
poetry run uvicorn app.main:app --host 0.0.0.0 --port 3000 --reload
```

### Docker環境

```bash
# Docker Compose経由で起動（推奨）
cd ../
make up

# または直接起動
docker build -t trip-shiori-ai .
docker run -p 3000:3000 --env-file .env trip-shiori-ai
```

## API エンドポイント

### ヘルスチェック

```http
GET /health
```

**レスポンス:**
```json
{
  "status": "ok",
  "service": "fastapi-sidecar",
  "version": "0.1.0",
  "environment_variables": {
    "CEREBRAS_API_KEY": "***masked***",
    "OPENAI_API_KEY": "***masked***",
    "TAVILY_API_KEY": "***masked***"
  }
}
```

<!-- 以前の内部トークン認証はTerraformのネットワーク制御に置き換え -->

### イベント補完

```http
POST /internal/ai/events-complete
Content-Type: application/json

{
  "event1": {
    "time": "10:00",
    "end_time": "10:30",
    "title": "出発",
    "description": "新宿駅から出発",
    "icon": "mdi-train"
  },
  "event2": {
    "time": "12:00",
    "end_time": "12:30",
    "title": "到着",
    "description": "東京駅に到着",
    "icon": "mdi-map-marker"
  }
}
```

**レスポンス:**
```json
{
  "time": "11:00",
  "end_time": "11:30",
  "title": "電車移動",
  "description": "新宿駅から東京駅まで電車で移動します。",
  "icon": "mdi-train"
}
```

### 旅程編集

```http
POST /internal/ai/itinerary-edit
Content-Type: application/json

{
  "originalItinerary": {
    "title": "東京観光旅行",
    "days": [
      {
        "date": "2025-09-01",
        "events": [
          {
            "time": "09:00",
            "end_time": "09:30",
            "title": "朝食",
            "description": "ホテルで朝食",
            "icon": "mdi-food"
          }
        ]
      }
    ]
  },
  "editPrompt": "2日目の朝食を和食レストランに変更してください"
}
```

**レスポンス:**
```json
{
  "modifiedItinerary": {
    "title": "東京観光旅行",
    "days": [
      {
        "date": "2025-09-01",
        "events": [
          {
            "time": "09:00",
            "end_time": "09:30",
            "title": "和食朝食",
            "description": "築地市場の老舗和食レストランで朝食",
            "icon": "mdi-food"
          }
        ]
      }
    ]
  },
  "changeDescription": "2日目の朝食を和食レストランに変更しました"
}
```

## 内部通信

このサービスはExpressバックエンドから内部HTTP通信で呼び出されます：

- **ネットワーク保護**: Terraformにより内部限定の通信に制御
- **ベースURL**: `http://ai:3000`（Docker Compose環境）
- **タイムアウト**: 30秒

## テスト

```bash
# テスト実行
poetry run pytest

# カバレッジ付きテスト
poetry run pytest --cov=app

# 特定のテストファイル
poetry run pytest tests/test_ai_service.py
```

## 開発

### コード品質

```bash
# フォーマット
poetry run black app/
poetry run isort app/

# リント
poetry run flake8 app/
```

### 依存関係管理

```bash
# 依存関係追加
poetry add package-name

# 開発依存関係追加
poetry add --group dev package-name

# 依存関係更新
poetry update
```

## トラブルシューティング

### よくある問題

1. **内部通信**
   - Terraformのネットワーク設定（VPC/Serverless VPC Access/Ingress）を確認

2. **LLM API エラー**
   - `CEREBRAS_API_KEY`または`OPENAI_API_KEY`が設定されているか確認
   - APIキーが有効か確認
   - ネットワーク接続を確認

3. **RAG機能エラー**
   - `TAVILY_API_KEY`が設定されているか確認
   - Tavily APIの利用制限に達していないか確認

4. **タイムアウトエラー**
   - `LLM_TIMEOUT_SEC`の値を適切に設定
   - ネットワークの遅延を確認

### ログ確認

```bash
# Docker Compose環境
make logs-ai

# 直接起動時
# ログは標準出力に出力されます
```

## アーキテクチャ

```
Express Backend
    ↓ HTTP (X-Internal-Token)
FastAPI Service (Port 3000)
    ↓
LangChain 0.3 + LangGraph
    ↓
Cerebras API (優先) / OpenAI API (フォールバック)
    ↓
Tavily Search API (RAG機能)
```

## 参考資料

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [LangChain Documentation](https://python.langchain.com/)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Cerebras API Documentation](https://docs.cerebras.ai/)
- [Tavily Search API Documentation](https://docs.tavily.com/)
