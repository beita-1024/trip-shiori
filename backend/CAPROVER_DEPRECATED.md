# CapRover Deployment - Deprecated

## 注意: CapRoverデプロイは無効化されました

このバックエンドサービスは、AI機能の分離によりCapRoverでのデプロイが無効になりました。

### 理由
- AI機能（FastAPI）が独立したサービス（`/ai`）に分離された
- バックエンドサービスからPython/FastAPI関連の依存関係が削除された
- Cloud Runでの4サービス構成（frontend/backend/ai/db）に移行

### 現在の構成
- **Frontend**: Next.js (Cloud Run)
- **Backend**: Express.js (Cloud Run) 
- **AI Service**: FastAPI (Cloud Run)
- **Database**: Cloud SQL

### CapRoverファイルの保持理由
- 将来の参考用として保持
- 必要に応じて復旧可能な状態を維持

### 代替デプロイ方法
Cloud Runを使用したデプロイメントを推奨します。
詳細は `terraform/` ディレクトリを参照してください。
