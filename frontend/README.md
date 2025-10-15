# Frontend Service (Next.js + React)

Trip Shioriのフロントエンドアプリケーションです。Next.js 14 + React 18 + Tailwind CSSを使用して、直感的な旅程編集とPDF出力機能を提供しています。

## 技術スタック

- **Next.js 14**: App Router・SSR/SSG・型安全なフルスタック開発
- **React 18**: Concurrent Features・Server Components
- **TypeScript**: 型安全なJavaScript開発
- **Tailwind CSS**: ユーティリティファースト・一貫性のあるデザインシステム
- **@dnd-kit**: ドラッグ&ドロップ機能・アクセシビリティ対応
- **@heroicons/react**: 一貫性のあるアイコンセット
- **react-hook-form**: パフォーマンス・バリデーション・型安全なフォーム管理

## 環境変数

### 必須環境変数

```bash
# API接続
NEXT_PUBLIC_API_URL=http://localhost:4002

# フロントエンドURL
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3001
```

### オプション環境変数

```bash
# 環境設定
NODE_ENV=development

# デバッグ
NEXT_PUBLIC_DEBUG=false
```

> ⚠️ **重要**: フロントエンドの環境変数は `NEXT_PUBLIC_` プレフィックスが必要です。このプレフィックスがない変数はブラウザで利用できません。

## 起動方法

### 開発環境

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# または
npm run start:dev
```

### Docker環境

```bash
# Docker Compose経由で起動（推奨）
cd ../
make up

# または直接起動
docker build -t trip-shiori-frontend .
docker run -p 3001:3001 --env-file .env trip-shiori-frontend
```

## 主要コマンド

### 開発

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm run start

# 型チェック
npm run type-check

# リント
npm run lint

# フォーマット
npm run format
```

### テスト

```bash
# テスト実行
npm test

# ウォッチモード
npm run test:watch

# カバレッジ付きテスト
npm run test:coverage
```

### Storybook

```bash
# Storybook起動
npm run storybook

# Storybookビルド
npm run build-storybook
```

## 主要機能

### 旅程編集

- **ドラッグ&ドロップ**: 直感的なイベントの並べ替え
- **リアルタイム編集**: 即座に反映される変更
- **AI補完**: イベント間の自動補完
- **自然言語編集**: AIによる旅程編集

### PDF出力

- **A4三つ折り最適化**: 印刷に最適なレイアウト
- **改ページ制御**: 安定した改ページ
- **折り目対応**: 三つ折り用の折り目表示

### 共有機能

- **URL共有**: 旅程の共有リンク生成
- **公開設定**: プライベート・リンク共有・全体公開
- **パスワード保護**: 共有時のパスワード設定
- **有効期限**: 共有の有効期限設定

## OGP対応

### 公開旅程のOGP

公開された旅程（`/public/{id}`）では以下のOGPメタタグが自動生成されます：

```html
<meta property="og:title" content="旅のしおり" />
<meta property="og:description" content="共有された旅のしおりです" />
<meta property="og:image" content="https://example.com/image.jpg" />
<meta property="og:url" content="https://example.com/public/itn_123" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="旅のしおり" />
```

### OGP画像

- デフォルト画像: プロジェクトロゴ
- カスタム画像: 旅程に応じた画像（将来実装予定）

## アクセシビリティ

### 対応機能

- **キーボード操作**: 全機能のキーボードアクセス
- **スクリーンリーダー**: ARIA属性による支援
- **フォーカス管理**: 適切なフォーカス移動
- **カラーコントラスト**: WCAG準拠の色使い

### ドラッグ&ドロップ

@dnd-kitを使用してアクセシビリティを確保：

- **キーボード操作**: 矢印キーでの移動
- **スクリーンリーダー**: 状態の音声読み上げ
- **フォーカス管理**: ドラッグ中のフォーカス制御

## デザインシステム

### カラートークン

`src/app/globals.css`でカラートークンを管理：

```css
:root {
  --color-primary: #3b82f6;
  --color-secondary: #64748b;
  --color-accent: #f59e0b;
  --color-background: #ffffff;
  --color-surface: #f8fafc;
  --color-text: #1e293b;
}
```

### レスポンシブデザイン

- **モバイルファースト**: モバイル優先の設計
- **ブレークポイント**: Tailwind CSSの標準ブレークポイント使用
- **タッチ操作**: タッチデバイスでの操作最適化

## 状態管理

### データフロー

```
Server Components (SSR/SSG)
    ↓
Client Components (CSR)
    ↓
React Hook Form + Zod
    ↓
API (Express Backend)
```

### 主要な状態

- **認証状態**: JWT Cookieベース
- **旅程データ**: React Hook Form管理
- **UI状態**: React State管理
- **エラー状態**: エラーバウンダリ

## パフォーマンス最適化

### Next.js最適化

- **SSR/SSG**: 適切なレンダリング方式選択
- **画像最適化**: Next.js Image コンポーネント
- **コード分割**: 動的インポート
- **バンドル最適化**: Tree Shaking

### フロントエンド最適化

- **メモ化**: React.memo・useMemo・useCallback
- **仮想化**: 大量データの効率的表示
- **遅延読み込み**: 必要時のみコンポーネント読み込み

## 開発

### コード品質

```bash
# リント
npm run lint

# フォーマット
npm run format

# 型チェック
npm run type-check

# 全チェック実行
npm run check
```

### デバッグ

```bash
# デバッグモード起動
NEXT_PUBLIC_DEBUG=true npm run dev

# 詳細ログ
DEBUG=* npm run dev
```

## トラブルシューティング

### よくある問題

1. **環境変数エラー**
   - `NEXT_PUBLIC_`プレフィックスが付いているか確認
   - ビルド時に環境変数が設定されているか確認

2. **API接続エラー**
   - `NEXT_PUBLIC_API_URL`が正しく設定されているか確認
   - バックエンドサービスが起動しているか確認
   - CORS設定を確認

3. **ビルドエラー**
   - TypeScriptの型エラーを確認
   - 依存関係のバージョン競合を確認

4. **OGP表示エラー**
   - 公開旅程のURLが正しいか確認
   - メタタグの生成を確認

### ログ確認

```bash
# Docker Compose環境
make logs-frontend

# 直接起動時
# ログは標準出力に出力されます
```

## テスト

### テスト戦略

- **ユニットテスト**: コンポーネントの単体テスト
- **統合テスト**: API連携のテスト
- **E2Eテスト**: ユーザーフローのテスト

### テスト実行

```bash
# 全テスト実行
npm test

# ウォッチモード
npm run test:watch

# カバレッジ付きテスト
npm run test:coverage

# E2Eテスト
npm run test:e2e
```

## デプロイ

### ビルド

```bash
# 本番ビルド
npm run build

# ビルド確認
npm run start
```

### 環境別設定

#### 開発環境

```bash
NEXT_PUBLIC_API_URL=http://localhost:4002
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3001
NODE_ENV=development
```

#### 本番環境

```bash
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_FRONTEND_URL=https://your-domain.com
NODE_ENV=production
```

## 参考資料

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [@dnd-kit Documentation](https://dndkit.com/)
- [React Hook Form Documentation](https://react-hook-form.com/)
