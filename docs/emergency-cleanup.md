# 緊急時リソース強制削除手順

## 概要

Terraformの`destroy`が失敗し、GCPリソースが残存している場合の強制削除手順です。

## 問題の原因

### 1. リソースの依存関係
- **Service Networking Connection**: Cloud SQL削除後も残存
- **Serverless IPv4予約アドレス**: Cloud Run削除後も残存（最大1時間）
- **VPCサブネット**: 上記2つに依存しているため削除不可

### 2. 削除順序の問題
- Terraformが依存関係を正しく解決できない
- 手動での段階的削除が必要

## 強制削除手順

### ステップ1: サービスアカウントで認証

```bash
# GitHub Actions用サービスアカウントで認証
gcloud auth activate-service-account github-actions@portfolio-472821.iam.gserviceaccount.com --key-file=github-actions-key.json
```

### ステップ2: 残存リソースの確認

```bash
# 1. Cloud SQLインスタンスの確認
gcloud sql instances list --filter="name:trip-shiori-dev-db-instance"

# 2. Serverless IPv4予約アドレスの確認
gcloud compute addresses list --regions=asia-northeast1 --filter="name~^serverless-ipv4-"

# 3. Service Networking Connectionの確認
gcloud services vpc-peerings list --network=trip-shiori-dev-vpc

# 4. VPCネットワークの確認
gcloud compute networks list --filter="name:trip-shiori-dev-vpc"
```

### ステップ3: 強制削除の実行

#### 3.1 Cloud SQLインスタンスの削除（存在する場合）

```bash
gcloud sql instances delete trip-shiori-dev-db-instance --quiet
```

#### 3.2 サービスアカウントの削除

```bash
gcloud iam service-accounts delete trip-shiori-dev-backend@portfolio-472821.iam.gserviceaccount.com --quiet
gcloud iam service-accounts delete trip-shiori-dev-ai@portfolio-472821.iam.gserviceaccount.com --quiet
gcloud iam service-accounts delete trip-shiori-dev-frontend@portfolio-472821.iam.gserviceaccount.com --quiet
```

#### 3.3 サブネットの強制削除

```bash
gcloud compute networks subnets delete trip-shiori-dev-subnet --region=asia-northeast1 --quiet
```

#### 3.4 VPCネットワークの削除

```bash
gcloud compute networks delete trip-shiori-dev-vpc --quiet
```

### ステップ4: Terraform状態のリセット

```bash
cd /home/d/repos/trip-shiori/terraform/environments/dev

# 全てのリソースを状態から削除
terraform state list | xargs terraform state rm

# 新しい状態で初期化
terraform init
```

### ステップ5: 再デプロイ

```bash
cd /home/d/repos/trip-shiori
make deploy-gcp-dev-full
```

## 代替案: 新しいVPC名でデプロイ

残存リソースの削除が困難な場合：

### ステップ1: VPC名の変更

```bash
cd /home/d/repos/trip-shiori/terraform/environments/dev

# VPC名を変更
sed -i 's/trip-shiori-dev-vpc/trip-shiori-dev-vpc-2/g' main.tf
sed -i 's/trip-shiori-dev-subnet/trip-shiori-dev-subnet-2/g' main.tf
sed -i 's/10.0.0.0\/24/10.1.0.0\/24/g' main.tf
```

### ステップ2: 新しいVPC名でデプロイ

```bash
cd /home/d/repos/trip-shiori
make deploy-gcp-dev-full
```

### ステップ3: 古いリソースの後処理

```bash
# 時間を置いてから古いリソースを削除
sleep 3600  # 1時間待機

# 古いVPCを削除
gcloud compute networks delete trip-shiori-dev-vpc --quiet
```

## トラブルシューティング

### エラー: "Service account does not exist"
- サービスアカウントが既に削除されている
- Terraform状態から該当リソースを削除: `terraform state rm <resource_name>`

### エラー: "Network already exists"
- VPCネットワークが残存している
- 手動削除または新しいVPC名を使用

### エラー: "Subnetwork is being used"
- Serverless IPv4予約アドレスが残存
- 時間を置いてから再試行（最大1時間）

## 必要な権限

サービスアカウントに以下の権限が必要：

- `roles/compute.admin` (VPC/サブネット削除)
- `roles/iam.serviceAccountAdmin` (サービスアカウント削除)
- `roles/cloudsql.admin` (Cloud SQL削除)
- `roles/secretmanager.admin` (Secret Manager削除)

## 注意事項

- **本番環境では絶対に実行しない**
- **データのバックアップを事前に取得**
- **削除前にリソースの確認を必ず行う**
- **段階的に実行し、各ステップで結果を確認**

## 関連ファイル

- `github-actions-key.json`: サービスアカウントキー
- `terraform/environments/dev/main.tf`: Terraform設定
- `Makefile`: デプロイスクリプト

---

