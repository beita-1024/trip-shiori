# Trip Shiori ドキュメント

このディレクトリには、Trip Shioriプロジェクトの設計ドキュメントが含まれています。

## 目次

### API関連
- [API仕様書](api/) - OpenAPI 3.1.0仕様書とSwagger UI
- [OpenAI統合ドキュメント](openai-integration.md) - OpenAI ChatGPT API統合の詳細
- [OpenAI使用例とベストプラクティス](openai-examples.md) - 具体的な使用例と最適化方法

### アーキテクチャ
- [システムコンテキスト図](architecture/system-context.mmd) - C4レベル1（関係図）
- [コンテナ図](architecture/container.mmd) - C4レベル2（コンテナ/境界）
- [データベーススキーマ](database-schema.md) - データベース設計

### 開発・運用
- [開発ガイド](dev-guide/) - 開発環境構築と開発手順
- [環境変数設定ガイド](environment-variables.md) - 環境変数の設定方法
- [UX設計](ux/) - ユーザーエクスペリエンス設計

## OpenAI統合について

Trip Shioriでは、OpenAIのChatGPT APIを使用した以下のAI機能を提供しています：

- **イベント補完**: 2つのイベントの間に新しいイベントを自動生成
- **旅程編集**: 自然言語での編集指示を理解し、旅程を自動更新

詳細については、[OpenAI統合ドキュメント](openai-integration.md)を参照してください。

## 概要

このディレクトリには、プロジェクトの設計ドキュメントが含まれています。各ドキュメントは開発・運用・保守に必要な情報を提供します。
