# OpenAI統合 使用例とベストプラクティス

このドキュメントでは、Trip ShioriのOpenAI統合機能の具体的な使用例とベストプラクティスを紹介します。

## 目次

1. [イベント補完の使用例](#イベント補完の使用例)
2. [旅程編集の使用例](#旅程編集の使用例)
3. [ベストプラクティス](#ベストプラクティス)
4. [トラブルシューティング](#トラブルシューティング)
5. [パフォーマンス最適化](#パフォーマンス最適化)

## イベント補完の使用例

### 基本的な使用例

**シナリオ**: 新宿駅から東京駅への移動イベントを補完

```javascript
// リクエスト
const response = await fetch('/api/events/complete', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': 'user123'
  },
  body: JSON.stringify({
    event1: {
      time: "10:00",
      end_time: "10:30",
      title: "出発",
      description: "新宿駅から出発",
      icon: "mdi-train"
    },
    event2: {
      time: "12:00",
      end_time: "12:30",
      title: "到着",
      description: "東京駅に到着",
      icon: "mdi-map-marker"
    }
  })
});

// レスポンス
{
  "time": "11:00",
  "end_time": "11:30",
  "title": "電車移動",
  "description": "新宿駅から東京駅まで電車で移動します。JR山手線または中央線を利用し、約1時間の移動時間です。",
  "icon": "mdi-train"
}
```

### 観光地間の移動補完

**シナリオ**: 浅草寺からスカイツリーへの移動

```javascript
const response = await fetch('/api/events/complete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event1: {
      time: "14:00",
      end_time: "15:00",
      title: "浅草寺観光",
      description: "浅草寺で参拝と観光",
      icon: "mdi-camera"
    },
    event2: {
      time: "16:00",
      end_time: "17:00",
      title: "スカイツリー到着",
      description: "東京スカイツリーに到着",
      icon: "mdi-map-marker"
    }
  })
});

// 生成されるイベント
{
  "time": "15:00",
  "end_time": "15:30",
  "title": "徒歩移動",
  "description": "浅草寺から東京スカイツリーまで徒歩で移動します。約30分の散歩コースで、浅草の街並みを楽しみながら向かいます。",
  "icon": "mdi-walk"
}
```

### 食事時間の補完

**シナリオ**: 昼食と夕食の間の時間

```javascript
const response = await fetch('/api/events/complete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event1: {
      time: "12:00",
      end_time: "13:00",
      title: "昼食",
      description: "築地市場で寿司を食べる",
      icon: "mdi-food"
    },
    event2: {
      time: "18:00",
      end_time: "19:00",
      title: "夕食",
      description: "銀座のレストランで夕食",
      icon: "mdi-food"
    }
  })
});

// 生成されるイベント
{
  "time": "13:00",
  "end_time": "17:30",
  "title": "銀座散策",
  "description": "築地から銀座まで移動し、銀座の街を散策します。デパートや専門店でのショッピング、カフェでの休憩などを楽しめます。",
  "icon": "mdi-walk"
}
```

## 旅程編集の使用例

### 基本的な編集例

**シナリオ**: 朝食の変更

```javascript
const response = await fetch('/api/itinerary-edit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    originalItinerary: {
      title: "東京観光旅行",
      days: [
        {
          date: "2025-09-01",
          events: [
            {
              time: "09:00",
              end_time: "09:30",
              title: "朝食",
              description: "ホテルで朝食",
              icon: "mdi-food"
            },
            {
              time: "10:00",
              end_time: "12:00",
              title: "浅草寺観光",
              description: "浅草寺で参拝",
              icon: "mdi-camera"
            }
          ]
        }
      ]
    },
    editPrompt: "2日目の朝食を和食レストランに変更してください"
  })
});

// レスポンス
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
              "end_time": "09:30",
              "title": "和食朝食",
              "description": "築地市場の老舗和食レストランで朝食",
              "icon": "mdi-food"
            },
            {
              "time": "10:00",
              "end_time": "12:00",
              "title": "浅草寺観光",
              "description": "浅草寺で参拝",
              "icon": "mdi-camera"
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

### 時間調整の例

**シナリオ**: 移動時間の延長

```javascript
const response = await fetch('/api/itinerary-edit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    originalItinerary: {
      title: "大阪観光",
      days: [
        {
          date: "2025-09-01",
          events: [
            {
              time: "10:00",
              end_time: "10:30",
              title: "新幹線移動",
              description: "東京から大阪まで新幹線で移動",
              icon: "mdi-train"
            },
            {
              time: "11:00",
              end_time: "12:00",
              title: "大阪城到着",
              description: "大阪城に到着",
              icon: "mdi-map-marker"
            }
          ]
        }
      ]
    },
    editPrompt: "新幹線の移動時間を30分延長してください"
  })
});

// 生成される変更
{
  "success": true,
  "data": {
    "modifiedItinerary": {
      "title": "大阪観光",
      "days": [
        {
          "date": "2025-09-01",
          "events": [
            {
              "time": "10:00",
              "end_time": "11:00",
              "title": "新幹線移動",
              "description": "東京から大阪まで新幹線で移動（時間延長）",
              "icon": "mdi-train"
            },
            {
              "time": "11:30",
              "end_time": "12:30",
              "title": "大阪城到着",
              description: "大阪城に到着",
              "icon": "mdi-map-marker"
            }
          ]
        }
      ]
    },
    "diffPatch": [
      {
        "op": "replace",
        "path": "/days/0/events/0/end_time",
        "value": "11:00"
      },
      {
        "op": "replace",
        "path": "/days/0/events/1/time",
        "value": "11:30"
      },
      {
        "op": "replace",
        "path": "/days/0/events/1/end_time",
        "value": "12:30"
      }
    ],
    "changeDescription": "新幹線の移動時間を30分延長し、後続のイベントも調整しました"
  }
}
```

### 複数変更の例

**シナリオ**: 複数の観光地を一度に変更

```javascript
const response = await fetch('/api/itinerary-edit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    originalItinerary: {
      title: "京都観光",
      days: [
        {
          date: "2025-09-01",
          events: [
            {
              time: "09:00",
              end_time: "11:00",
              title: "清水寺観光",
              description: "清水寺で参拝",
              icon: "mdi-camera"
            },
            {
              time: "11:30",
              end_time: "13:00",
              title: "金閣寺観光",
              description: "金閣寺で参拝",
              icon: "mdi-camera"
            }
          ]
        }
      ]
    },
    editPrompt: "清水寺を伏見稲荷大社に、金閣寺を嵐山に変更してください"
  })
});
```

## ベストプラクティス

### 1. イベント補完のベストプラクティス

#### 適切な時間間隔の設定
```javascript
// ✅ 良い例: 適切な時間間隔
{
  event1: { time: "10:00", end_time: "10:30", ... },
  event2: { time: "12:00", end_time: "12:30", ... }  // 1.5時間の間隔
}

// ❌ 悪い例: 時間間隔が短すぎる
{
  event1: { time: "10:00", end_time: "10:30", ... },
  event2: { time: "10:35", end_time: "11:00", ... }  // 5分の間隔
}
```

#### 明確なイベント情報の提供
```javascript
// ✅ 良い例: 詳細な情報
{
  event1: {
    time: "10:00",
    end_time: "10:30",
    title: "新宿駅出発",
    description: "新宿駅から電車で出発",
    icon: "mdi-train"
  }
}

// ❌ 悪い例: 情報が不十分
{
  event1: {
    time: "10:00",
    title: "出発",
    icon: "mdi-train"
  }
}
```

### 2. 旅程編集のベストプラクティス

#### 具体的な編集指示
```javascript
// ✅ 良い例: 具体的な指示
"2日目の朝食を築地市場の寿司店に変更してください"

// ❌ 悪い例: 曖昧な指示
"朝食を変更してください"
```

#### 段階的な編集
```javascript
// ✅ 良い例: 1つずつ変更
"朝食を和食に変更してください"
// その後
"移動時間を30分延長してください"

// ❌ 悪い例: 複数の変更を一度に
"朝食を和食に変更し、移動時間を30分延長し、観光地を変更してください"
```

### 3. エラーハンドリング

#### 適切なエラー処理
```javascript
try {
  const response = await fetch('/api/events/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestData)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`API Error: ${errorData.error}`);
  }

  const result = await response.json();
  return result;
} catch (error) {
  console.error('イベント補完エラー:', error);
  
  // ユーザーに分かりやすいエラーメッセージを表示
  if (error.message.includes('timeout')) {
    showError('AI処理がタイムアウトしました。しばらく待ってから再試行してください。');
  } else if (error.message.includes('rate limit')) {
    showError('リクエストが多すぎます。しばらく待ってから再試行してください。');
  } else {
    showError('AI処理でエラーが発生しました。');
  }
}
```

### 4. パフォーマンス最適化

#### キャッシュの活用
```javascript
// 同じ入力に対する結果をキャッシュ
const cache = new Map();

async function completeEvent(event1, event2) {
  const cacheKey = JSON.stringify({ event1, event2 });
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  const result = await fetch('/api/events/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event1, event2 })
  }).then(res => res.json());
  
  cache.set(cacheKey, result);
  return result;
}
```

#### 並列処理の活用
```javascript
// 複数のイベント補完を並列実行
async function completeMultipleEvents(eventPairs) {
  const promises = eventPairs.map(({ event1, event2 }) =>
    fetch('/api/events/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event1, event2 })
    }).then(res => res.json())
  );
  
  return Promise.all(promises);
}
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. 生成されたイベントが不適切

**問題**: AIが生成したイベントが期待と異なる

**解決方法**:
```javascript
// より詳細なイベント情報を提供
{
  event1: {
    time: "10:00",
    end_time: "10:30",
    title: "新宿駅出発",
    description: "新宿駅から東京駅方面への電車で出発",
    icon: "mdi-train"
  },
  event2: {
    time: "12:00",
    end_time: "12:30",
    title: "東京駅到着",
    description: "東京駅に到着、改札を出る",
    icon: "mdi-map-marker"
  }
}
```

#### 2. 時間形式のエラー

**問題**: 生成された時間が正しい形式でない

**解決方法**:
```javascript
// 入力イベントの時間形式を確認
function validateTimeFormat(time) {
  return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
}

if (!validateTimeFormat(event1.time)) {
  throw new Error('時間はHH:MM形式で入力してください');
}
```

#### 3. API呼び出しのタイムアウト

**問題**: 30秒でタイムアウトする

**解決方法**:
```javascript
// リトライ機能の実装
async function completeEventWithRetry(event1, event2, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/api/events/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event1, event2 })
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## パフォーマンス最適化

### 1. リクエスト最適化

#### 不要なデータの削除
```javascript
// ✅ 良い例: 必要なデータのみ送信
{
  event1: {
    time: "10:00",
    end_time: "10:30",
    title: "出発",
    description: "新宿駅から出発",
    icon: "mdi-train"
  }
}

// ❌ 悪い例: 不要なデータも含む
{
  event1: {
    time: "10:00",
    end_time: "10:30",
    title: "出発",
    description: "新宿駅から出発",
    icon: "mdi-train",
    id: "event_123",           // 不要
    createdAt: "2025-01-01",   // 不要
    updatedAt: "2025-01-01"    // 不要
  }
}
```

### 2. ユーザー体験の向上

#### ローディング状態の表示
```javascript
async function completeEvent(event1, event2) {
  showLoading('AIがイベントを生成中...');
  
  try {
    const result = await fetch('/api/events/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event1, event2 })
    }).then(res => res.json());
    
    hideLoading();
    return result;
  } catch (error) {
    hideLoading();
    throw error;
  }
}
```

#### プログレス表示
```javascript
function showProgress(message) {
  const progressElement = document.getElementById('ai-progress');
  progressElement.textContent = message;
  progressElement.style.display = 'block';
}

// 使用例
showProgress('AIがイベントを分析中...');
// 処理
showProgress('イベントを生成中...');
// 処理
showProgress('検証中...');
```

### 3. モニタリング

#### 使用量の追跡
```javascript
// 使用量を追跡
function trackAIUsage(endpoint, duration, success) {
  const usage = {
    endpoint,
    duration,
    success,
    timestamp: new Date().toISOString(),
    userId: getCurrentUserId()
  };
  
  // ローカルストレージに保存
  const usageHistory = JSON.parse(localStorage.getItem('ai-usage') || '[]');
  usageHistory.push(usage);
  localStorage.setItem('ai-usage', JSON.stringify(usageHistory.slice(-100))); // 最新100件のみ
}
```

## まとめ

OpenAI統合機能を効果的に活用するには：

1. **適切な入力データ**: 詳細で正確なイベント情報を提供
2. **具体的な指示**: 旅程編集では明確で具体的な指示を出す
3. **エラーハンドリング**: 適切なエラー処理とユーザーフィードバック
4. **パフォーマンス最適化**: キャッシュと並列処理の活用
5. **ユーザー体験**: ローディング状態とプログレス表示

これらのベストプラクティスに従うことで、AI機能を最大限に活用できます。

---

最終更新: 2025-09-15
