# OpenAI統合ドキュメント

このドキュメントでは、Trip ShioriプロジェクトにおけるOpenAI APIの統合について詳しく説明します。

## 概要

Trip Shioriでは、OpenAIのChatGPT APIを使用して以下のAI機能を提供しています：

- **イベント補完**: 2つのイベントの間に新しいイベントを自動生成
- **旅程編集**: 自然言語での旅程編集指示を理解し、旅程を更新

## アーキテクチャ

### コンポーネント構成

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │     Backend      │    │   OpenAI API    │
│                 │    │                  │    │                 │
│ - イベント補完UI │───▶│ - eventsRouter   │───▶│ - ChatGPT API   │
│ - 旅程編集UI    │    │ - itineraryEdit  │    │ - GPT-4o Mini   │
│                 │    │ - ChatGptClient  │    │ - GPT-4         │
│                 │    │ - JsonCompleter  │    │ - GPT-3.5 Turbo │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 主要コンポーネント

#### 1. ChatGptClient (`backend/src/adapters/chatGptClient.ts`)

OpenAI APIの低レベルクライアント。以下の機能を提供：

- **型安全性**: TypeScriptによる厳密な型定義
- **エラーハンドリング**: API呼び出し失敗時の適切なエラー処理
- **タイムアウト制御**: 30秒のデフォルトタイムアウト
- **パラメータ設定**: 温度、top-p、頻度ペナルティなどの調整可能

```typescript
const client = new ChatGptClient({
  model: ModelType.GPT_4O_MINI,
  systemContent: "あなたは有能なアシスタントです。",
  temperature: 0.7,
  timeoutMs: 30000
});
```

#### 2. JsonCompleter (`backend/src/services/jsonCompleter.ts`)

JSON形式でのAI補完を管理するサービス：

- **スキーマ検証**: 生成されたJSONの妥当性チェック
- **リトライ機能**: 最大5回までの再試行
- **デバッグモード**: 開発時の詳細ログ出力
- **ダミーモード**: テスト用のモックレスポンス

#### 3. ModelType (`backend/src/types/modelType.ts`)

サポートされているOpenAIモデルの型定義：

- `gpt-3.5-turbo`: 高速でコスト効率の良いモデル
- `gpt-4`: 高精度な推論が可能なモデル  
- `gpt-4o-mini`: GPT-4oの軽量版（推奨）

## API エンドポイント

### 1. イベント補完 API

**エンドポイント**: `POST /api/events/complete`

**機能**: 2つのイベントの間に新しいイベントをAI生成

**リクエスト例**:
```json
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

**レスポンス例**:
```json
{
  "time": "11:00",
  "end_time": "11:30",
  "title": "電車移動",
  "description": "新宿駅から東京駅まで電車で移動します。JR山手線または中央線を利用し、約1時間の移動時間です。",
  "icon": "mdi-train"
}
```

**技術仕様**:
- **使用モデル**: 環境変数`LLM_MODEL`で指定（デフォルト: `gpt-4o-mini`）
- **温度設定**: 0.7（創造性と一貫性のバランス）
- **最大トークン**: 1000
- **タイムアウト**: 30秒
- **リトライ**: 最大5回

### 2. 旅程編集 API

**エンドポイント**: `POST /api/itinerary-edit`

**機能**: 自然言語での旅程編集指示を理解し、旅程を更新

**リクエスト例**:
```json
{
  "originalItinerary": {
    "title": "東京観光旅行",
    "days": [
      {
        "date": "2025-09-01",
        "events": [
          {
            "time": "09:00",
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

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "modifiedItinerary": {
      "title": "東京観光旅行",
      "days": [
        {
          "date": "2025-09-01", 
          "events": [
            {
              "time": "09:00",
              "title": "和食朝食",
              "description": "築地市場の老舗和食レストランで朝食",
              "icon": "mdi-food"
            }
          ]
        }
      ]
    },
    "diffPatch": {
      "op": "replace",
      "path": "/days/0/events/0/title",
      "value": "和食朝食"
    },
    "changeDescription": "2日目の朝食を和食レストランに変更しました"
  }
}
```

## 設定と環境変数

### 必須環境変数

```bash
# OpenAI API キー（必須）
OPENAI_API_KEY=sk-...

# 使用するモデル（オプション、デフォルト: gpt-4o-mini）
LLM_MODEL=gpt-4o-mini

# デバッグモード（オプション）
DEBUG=1
```

### 推奨設定

**本番環境**:
- モデル: `gpt-4o-mini`（コスト効率と性能のバランス）
- 温度: 0.7（創造性と一貫性）
- タイムアウト: 30秒

**開発環境**:
- モデル: `gpt-4o-mini`
- デバッグモード: 有効
- ダミーモード: テスト時は有効

## エラーハンドリング

### 一般的なエラー

1. **API キー未設定**
   ```
   Error: OPENAI_API_KEY is not set in environment
   ```

2. **無効なモデル**
   ```
   Error: Invalid model: invalid-model. valid: gpt-3.5-turbo, gpt-4, gpt-4o-mini
   ```

3. **API呼び出し失敗**
   ```
   Error: OpenAI API error 401: Invalid API key
   ```

4. **タイムアウト**
   ```
   Error: OpenAI request timed out
   ```

### エラー対応

- **401 Unauthorized**: APIキーの確認
- **429 Rate Limited**: レート制限の確認と待機
- **500 Internal Server Error**: OpenAI側の障害、リトライ推奨

## パフォーマンス最適化

### 1. モデル選択

| モデル | 速度 | コスト | 精度 | 用途 |
|--------|------|--------|------|------|
| gpt-3.5-turbo | 高速 | 低 | 中 | 基本的な補完 |
| gpt-4o-mini | 中速 | 中 | 高 | 推奨（バランス型） |
| gpt-4 | 低速 | 高 | 最高 | 複雑な編集 |

### 2. パラメータ調整

```typescript
// 高速・低コスト設定
{
  model: ModelType.GPT_3_5_TURBO,
  temperature: 0.3,
  maxTokens: 500
}

// 高品質設定
{
  model: ModelType.GPT_4,
  temperature: 0.7,
  maxTokens: 2000
}
```

### 3. キャッシュ戦略

- 同じ入力に対する結果をキャッシュ
- ユーザーセッション単位でのキャッシュ管理
- キャッシュ有効期限: 1時間

## セキュリティ考慮事項

### 1. API キー管理

- 環境変数での管理（コードにハードコードしない）
- 本番環境では専用のAPIキーを使用
- 定期的なキーローテーション

### 2. 入力検証

- ユーザー入力のサニタイゼーション
- JSONスキーマによる出力検証
- 最大トークン数制限

### 3. レート制限

- OpenAI APIのレート制限に準拠
- アプリケーションレベルでの追加制限
- ユーザー単位での使用量監視

## 監視とログ

### ログ出力

```typescript
// リクエスト開始
console.log(`[eventsRouter] POST /api/events/complete start userId=${userId}`);

// 成功時
console.log(`[eventsRouter] POST /api/events/complete success durationMs=${duration}`);

// エラー時
console.error("events.complete error:", err);
```

### メトリクス

- API呼び出し回数
- レスポンス時間
- エラー率
- トークン使用量

## トラブルシューティング

### よくある問題

1. **生成されたJSONが無効**
   - スキーマ検証でエラー
   - リトライ機能で自動再試行
   - 最大5回まで再試行

2. **レスポンスが遅い**
   - モデルを`gpt-4o-mini`に変更
   - タイムアウト値を調整
   - ネットワーク状況を確認

3. **生成内容が不適切**
   - システムプロンプトの調整
   - 温度パラメータの調整
   - 入力データの品質向上

### デバッグ手順

1. デバッグモードを有効化
2. ログ出力を確認
3. ダミーモードでテスト
4. OpenAI APIの直接テスト

## 今後の拡張予定

### 計画中の機能

1. **ストリーミング対応**: リアルタイムでの生成結果表示
2. **複数モデル対応**: 用途に応じたモデル選択
3. **カスタムプロンプト**: ユーザー定義のプロンプトテンプレート
4. **バッチ処理**: 複数のイベントを一括生成

### 技術的改善

1. **キャッシュ機能**: Redis を使用した結果キャッシュ
2. **非同期処理**: キューを使用したバックグラウンド処理
3. **A/Bテスト**: 異なるモデル・パラメータの比較
4. **分析機能**: 生成品質の自動評価

## 参考資料

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [ChatGPT API Reference](https://platform.openai.com/docs/api-reference/chat)
- [Model Pricing](https://openai.com/pricing)
- [Best Practices](https://platform.openai.com/docs/guides/production-best-practices)

---

最終更新: 2025-09-15
