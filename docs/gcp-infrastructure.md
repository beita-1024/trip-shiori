# GCPインフラ構成図

Trip ShioriのGCP上のインフラ構成をTerraformの定義に基づいてまとめた図解です。Cloud Run、VPC、Cloud SQL、AIサービスを中心に、各リソースがどのように連携しているかを俯瞰できます。

## 構成

```mermaid
%%{ init: { "flowchart": { "curve": "basis" } } }%%

flowchart TD
    subgraph Users[エンドユーザー]
        User[ブラウザ]
    end

    subgraph CICD[CI/CD & IaC]
        GH["GitHub Actions<br/>CIパイプライン"]
        TF["Terraform<br/>IaC<br/>（GCPリソース全体を管理）"]
    end

    subgraph GCP["GCP Project: portfolio-472821"]
        subgraph CloudRunGroup[Cloud Run Services]
            FE["**Cloud Run.frontend**<br/>Frontend (外部公開)<br/>egress: PRIVATE_RANGES_ONLY"]
            BE["**Cloud Run.backend**<br/>Backend (外部公開)<br/>egress: PRIVATE_RANGES_ONLY"]
            AI["**Cloud Run.ai**<br/>AI Service (内部専用)<br/>egress: ALL_TRAFFIC"]
        end

        subgraph VPC["🏢 VPC: trip-shiori-prod-vpc<br/>プライベートネットワーク空間"]
            VPCMain["**Network.main**<br/>google_compute_network<br/>auto_create_subnetworks = false"]
            
            subgraph Subnet["📦 Subnet: 10.0.0.0/24<br/>Direct VPC Egress用"]
                SubnetMain["**Subnet.main**<br/>IP: 10.0.0.0/24"]
                NAT["**Router NAT.ai_nat**<br/>Cloud NAT<br/>AI用外部APIアクセス"]
                Router["**Router.nat_router**<br/>Cloud Router<br/>NAT管理"]
            end
            
            subgraph VPCComponents["VPC内コンポーネント"]
                ServiceNetworking["**Service Networking**<br/>Private Service Connect"]
                DNS["**DNS Zone**<br/>Private DNS (run.app.)"]
                Firewall["**Firewall**<br/>VPC境界制御<br/>egress許可 (80,443,53)"]
            end
        end

        subgraph Secrets[Secret Manager]
            SM["**module.secrets**<br/>機密情報管理<br/>DB認証情報・APIキー"]
        end

        subgraph ExternalAPIs[外部API]
            OpenAI["OpenAI API"]
            Cerebras["Cerebras API"]
            Tavily["Tavily API"]
        end

        SQL[("**SQL Instance.main**<br/>Cloud SQL PostgreSQL 16<br/>Private IP")]
        GCS["**Storage Bucket.static**<br/>Cloud Storage<br/>Static Assets"]
        GCR["Artifact Registry (gcr.io)"]
    end

    User -->|HTTPS（Cloud Run マネージドLB経由）| FE
    User -->|HTTPS（カスタムドメイン / Invoker=allUsers）| BE

    GH -->|Docker Build・Test・Push| GCR
    GH -->|Terraform Apply| TF

    TF -->|GCPリソースの作成/更新| GCP

    FE -->|コンテナイメージ Pull| GCR
    BE -->|コンテナイメージ Pull| GCR
    AI -->|コンテナイメージ Pull| GCR

    BE -->|内部HTTP通信 + IDトークン認証| AI
    BE -->|Direct VPC Egress| VPCMain
    AI -->|Direct VPC Egress| VPCMain
    VPCMain -->|VPC内ルーティング| SubnetMain
    SubnetMain -->|Cloud Router経由| Router
    Router -->|NAT管理| NAT
    NAT -->|外部API呼び出し| Firewall
    Firewall -->|egress許可| ExternalAPIs

    SubnetMain -->|Private Service Connect| ServiceNetworking
    ServiceNetworking -->|Cloud SQL Private IP を提供| SQL

    FE -->|静的アセット取得（HTTPS）| GCS

    BE -->|機密情報取得| SM
    AI -->|機密情報取得| SM
```

## リソース対応表

| リソース | 役割 | Terraform参照 |
|----------|------|----------------|
| Cloud Run Frontend | Next.jsアプリをホスト。カスタムドメイン経由で公開。egress=PRIVATE_RANGES_ONLY | `terraform/environments/*/main.tf` の `google_cloud_run_v2_service.frontend` |
| Cloud Run Backend | Express APIをホスト。JWT認証やAIサービス連携を提供。egress=PRIVATE_RANGES_ONLY | 同上 `google_cloud_run_v2_service.backend` |
| Cloud Run AI Service | FastAPI + LangChainでAI機能を提供。内部専用（ingress=INTERNAL_ONLY）、外部APIアクセス用（egress=ALL_TRAFFIC） | 同上 `google_cloud_run_v2_service.ai` |
| VPC (Network) | プロジェクト全体のプライベートネットワーク空間。auto_create_subnetworks = falseで手動サブネット管理 | `google_compute_network.main` |
| Subnetwork | Direct VPC Egress用のプライベート通信を確保。Cloud SQLを外部から切り離す | `google_compute_subnetwork.main` |
| Cloud Router | Cloud NATを動作させるためのルーター。AIサービス外部APIアクセス用 | `google_compute_router.nat_router` |
| Cloud NAT | プライベートIPから外部APIへのアクセスを可能にする。AIサービス専用 | `google_compute_router_nat.ai_nat` |
| ファイアウォールルール | VPC内から外部へのegressトラフィックを許可（HTTPS, HTTP, DNS） | `google_compute_firewall.allow_egress_external` |
| Service Networking接続 | Cloud SQL Private IP用のService Networking構成 | `google_compute_global_address.private_service_range`, `google_service_networking_connection.private_vpc_connection` |
| Private DNS Zone | Direct VPC Egress用のDNS解決（run.app.） | `google_dns_managed_zone.cloud_run_dns_zone` |
| Cloud SQL (PostgreSQL 16) | アプリケーションデータの永続化。Private IPのみ | `google_sql_database_instance.main` と関連リソース |
| Secret Manager | 機密情報（DB認証情報、APIキー、JWT秘密鍵）の安全な管理 | `module.secrets` で管理 |
| Cloud Storageバケット | 共有アセットやバックアップ用途の静的ストレージ（※現状は未使用） | `google_storage_bucket.static` |
| Artifact Registry (gcr.io) | Cloud Runで使用するコンテナイメージの保管 | Terraform外（GitHub Actionsでビルド＆プッシュ） |
| Terraform (IaC) | 全リソースをコード化、再現性のあるデプロイ | `terraform/environments/` 配下 |
| GitHub Actions | CI/CD実行。Dockerビルド、テスト、Terraform適用を自動化 | `.github/workflows/` |

## 通信パスのポイント
- **外部公開サービス**: Frontend/Backendは外部からHTTPSでアクセス可能。AIサービスは内部専用（`ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY"`）。
- **内部通信**: BackendからAIサービスへの通信は内部HTTP + IDトークン認証で行われ、VPC内のネットワーク制御により保護されています。
- **責任分離設計**: 
  - **Backend**: データベースアクセスを担当（`egress = "PRIVATE_RANGES_ONLY"`）
  - **AIサービス**: 外部APIアクセスのみ担当（`egress = "ALL_TRAFFIC"`、DBアクセスなし）
  - **Frontend**: 静的アセット配信のみ担当
- **VPCアクセス設定**: 
  - Backend/Frontend: `egress = "PRIVATE_RANGES_ONLY"` でVPC内リソース（Cloud SQL）のみアクセス
  - AIサービス: `egress = "ALL_TRAFFIC"` で外部API（OpenAI/Cerebras/Tavily）へのアクセスのみ許可
- **外部APIアクセス**: AIサービスはDirect VPC Egress経由でサブネット（10.0.0.0/24）に接続し、サブネット → Cloud Router → Cloud NAT → VPC内のファイアウォール（境界制御）経由で外部APIにアクセス。ファイアウォールルールでHTTPS/HTTP/DNSのみ許可。
- **Cloud SQL接続**: BackendのみがDirect VPC Egress → VPC → Private Service Connect経由でCloud SQLのプライベートIPにアクセス。AIサービスはDBアクセス権限なし。
- **機密情報管理**: Secret ManagerでDB認証情報、APIキー、JWT秘密鍵を安全に管理し、各サービスが動的に取得。
- **CI/CD**: GitHub Actionsでビルド→Artifact Registryプッシュ→Terraform適用→Cloud Runリリースまで自動化。
- **DNS設定**: Private DNS Zone（run.app.）でDirect VPC Egress時の名前解決をサポート。

## 接続詳細
- **エンドユーザー → Cloud Run frontend/backend**: HTTPSのカスタムドメイン経由でCloud Runのマネージドエンドポイントに到達。AIサービスは外部から直接アクセス不可。
- **Backend → AI Service**: 内部HTTP通信 + IDトークン認証でAI機能を呼び出し。VPC内のネットワーク制御により外部からの直接アクセスを防止。
- **Cloud Run → Direct VPC Egress**: Backend/Frontend/AIサービスはDirect VPC Egress経由でVPCに接続。Serverless VPC Connectorは使用していない。
- **Direct VPC Egress → Service Networking → Cloud SQL**: VPC内のプライベートIP経由でService Networkingの予約レンジを通じてCloud SQL Private IPに到達。
- **Cloud Run backend → VPC → Private Service Connect → Cloud SQL**: BackendのみがDirect VPC Egress経由でVPCに接続し、Private Service Connectを通じてCloud SQLのPrivate IPにアクセス。AIサービスはDBアクセス権限なし。接続文字列はPrivate IPを参照（例: `postgresql://trip_shiori_user:***@10.0.x.x:5432/trip_shiori`）。Cloud SQLのパブリックIPv4は無効化。
- **Cloud Run services ↔ Secret Manager**: 機密情報（DB認証情報、APIキー、JWT秘密鍵）を動的に取得。IAMロールベースのアクセス制御。
- **AI Service → VPC → サブネット（10.0.0.0/24）→ Cloud Router → Cloud NAT → ファイアウォール → 外部API**: OpenAI、Cerebras、Tavily APIへのHTTPS通信。Direct VPC Egress経由でVPCに接続し、VPC内ルーティングでサブネットに到達、サブネット → Cloud Router → Cloud NAT → VPC内のファイアウォール（境界制御）経由で外部アクセスを許可。
- **Cloud Run frontend ↔ Cloud Storage**: 静的アセットをHTTPS経由で取得。バケットはGoogle管理サービスに配置。
- **GitHub Actions → Artifact Registry / Terraform**: CI/CDがコンテナをビルドしてgcr.ioへプッシュし、Terraform Applyで全リソースを更新。
- **Private DNS Zone**: Direct VPC Egress時の名前解決をサポート（run.app.ドメイン）。

## AWSとの違い（比較メモ）
- **リソースの配置感**: AWSではVPC→サブネット→EC2/ECSなど、各リソースがサブネットのプライベートIPを持つ前提で配置する。一方GCPのCloud RunやCloud StorageはGoogle管理サービス側に常駐し、VPCには必要なときだけDirect VPC Egress/Private Service Connectで接続する。
- **サーバーレスのネットワーク参加**: AWSのLambda(Fargate)はENIアタッチでサブネットに直接参加できるが、Cloud RunはDirect VPC Egress経由でプライベート通信を確保する。サービス自体がサブネット内には常駐しない。
- **構成図の描き方**: AWSはサブネット単位でリソースを箱に入れる絵が一般的。GCPはVPCを"専用線"として描き、Cloud Run/Cloud StorageなどGoogle管理サービスとは線で結ぶ表現が多い。
- **ストレージ/レジストリの扱い**: S3やECRはVPCエンドポイントでVPCに"持ち込める"が、GCSやgcr.ioは基本的にGoogle管理サービスとして公開APIにアクセスする（VPC Service Controlsで境界制御は可能だがVPC内部に常駐はしない）。
- **Private Service Connect vs PrivateLink**: GCPはService Networking/PSCでマネージドサービスにプライベート経路を提供し、AWSはPrivateLinkやVPCエンドポイントで同様の機能を提供。いずれも「共有サービスをプライベートに見せる」仕組みだが、実装コンポーネントが異なる。
- **外部APIアクセス**: AWSではNAT Gateway/Instanceで外部アクセスを制御するが、GCPではCloud Router → Cloud NAT + ファイアウォールルールで同様の機能を提供。Direct VPC Egressにより、よりシンプルな構成で外部APIアクセスが可能。

## AWSサービスとの対応表

| GCPサービス | AWSで近いサービス | 補足 |
|-------------|-----------------|------|
| Cloud Run | ECS Fargate + Application Load Balancer + AWS Certificate Manager | コンテナ実行に加え、HTTPS公開・ロードバランシング・証明書管理まで一括で提供する点が Fargate 単体より抽象度が高い |
| Cloud SQL (PostgreSQL) | Amazon RDS for PostgreSQL | マネージド RDB。Cloud SQL は Private Service Connect で VPC に露出する、RDS はサブネットに配置される点が異なる |
| Direct VPC Egress | AWS PrivateLink / VPC エンドポイント (Interface) | サーバーレス環境からVPCのプライベートリソースへ直接接続する仕組み |
| Cloud Router + Cloud NAT | AWS NAT Gateway | プライベートIPから外部へのアクセスを可能にするNATサービス。GCPではCloud RouterがCloud NATを管理 |
| Service Networking (Private Service Connect) | AWS PrivateLink (Service) | マネージドサービスにプライベート IP を割り当てる仕組み。Cloud SQL の Private IP 提供に利用 |
| Cloud Storage | Amazon S3 | オブジェクトストレージ。どちらもVPC内には常駐せず、API/IAMで制御 |
| Artifact Registry (gcr.io) | Amazon ECR | コンテナイメージレジストリ。Terraform からは参照のみで、CI/CD が Push を担当 |
| Cloud Logging / Ops (本構成では省略) | Amazon CloudWatch | Cloud Run や Cloud SQL のログ・メトリクスを収集するマネージド監視基盤 |
| Terraform (HashiCorp) | AWS CloudFormation / CDK | IaC ツール。Terraform はクラウド横断、CloudFormation/CDK は AWS ネイティブ |

## 想定Q&A
- **Q: なぜ Cloud Run を選んだのですか？**  
  A: サーバーレスで運用負荷が軽く、HTTPS アプリなら最小構成で始められる。Fargate+ALB+ACM を組み合わせる AWS よりもセットアップが簡単で、`min_instance_count = 0` によりアイドル時コストを抑えられる。オートスケールと証明書管理も自動化されるので開発速度を優先できる。
- **Q: AIサービスはなぜ内部専用にしたのですか？**  
  A: セキュリティ向上と責任分離のため。`ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY"`により外部からの直接アクセスを防止し、Backendからの内部HTTP通信のみ許可。また、AIサービスは外部APIアクセスのみを担当し、データベースアクセス権限は持たない設計。
- **Q: Cloud Run から Cloud SQL への通信はどう守っていますか？**  
  A: Cloud SQL のパブリック IPv4 は無効化し、BackendはDirect VPC Egress → VPC → Private Service Connect経由でCloud SQLのPrivate IPのみにアクセス可能。
- **Q: 機密情報はどう管理していますか？**  
  A: Secret ManagerでDB認証情報、APIキー、JWT秘密鍵を安全に管理。各サービスがIAMロールベースで動的に取得し、環境変数にハードコードしない。
- **Q: VPC/Subnet はどこで使っていますか？**  
  A: Cloud Run 自体は VPC に常駐しないが、Direct VPC Egress 経由で VPC に接続し、Cloud SQL Private IP にアクセスする。VPC/Subnet は主にこの経路確保と外部APIアクセス（Cloud Router → Cloud NAT）のため。
- **Q: AIサービスの外部APIアクセスはどう設定していますか？**  
  A: AIサービスは`egress = "ALL_TRAFFIC"`設定 + Direct VPC Egress経由でサブネット（10.0.0.0/24）に接続し、サブネット → Cloud Router → Cloud NAT → VPC内のファイアウォール（境界制御）経由で外部API（OpenAI/Cerebras/Tavily）へのアクセスを許可。Backend/Frontendは`PRIVATE_RANGES_ONLY`でVPC内リソースのみアクセス。
- **Q: Cloud Storage や Container Registry は VPC 内ですか？**  
  A: いずれも Google 管理サービス。IAM と HTTPS で保護され、VPC 内には置かれていない。
- **Q: AWS との違いは？**  
  A: AWS はリソースをサブネット内に配置するモデル。GCP の Cloud Run は Google 管理サービス側にあり、VPC へは Direct VPC Egress/PSC で接続する。このため構成図も"箱の中に並べる"というより"サービスと線で接続する"描き方になる。
- **Q: ルーティングやロードバランサは？**  
  A: Cloud Run がマネージドな HTTPS エンドポイントと LB を提供。DNS でカスタムドメインを設定すれば個別のルートテーブルや静的 IP を意識しなくて済む。
- **Q: CI/CD はどう構成していますか？**  
  A: GitHub Actions でビルド → テスト → gcr.io への push→Terraform apply→Cloud Run リリースまで自動化。Terraform が VPC/Cloud SQL/Secret Manager も管理する。
- **Q: 将来的に Compute Engine や GKE を追加する想定は？**  
  A: カスタム VPC/Subnet が既にあるので、必要になればそのレンジ内に VM/ノードを追加できる拡張余地がある。Cloud Router → Cloud NATも既に設定済みなので、外部APIアクセスも可能。
- **Q: Cloud Run の IP や証明書はどう管理していますか？**  
  A: Cloud Run のエンドポイントは Google が管理し、IP は動的。カスタムドメインを設定すれば証明書更新も含め自動で面倒を見てくれるので静的 IP は不要。
- **Q: 外部公開しているのはどこまで？**  
  A: 外部から到達できるのは Cloud Run frontend/backend の HTTPS のみ。AIサービスは内部専用、Cloud SQL は Private IP のみ（Backendからのみアクセス可能、AIサービスはDBアクセス権限なし）、バケットやレジストリは IAM で制御しつつ公開 API 経由で利用する。

## 関連ドキュメント
- `terraform/README.md` – Terraform全体の操作ガイド
- `docs/deployment/gcp-deployment-guide.md` – Cloud Run/Cloud SQLデプロイ手順
- `docs/github-actions-deployment.md` – GitHub Actionsによる自動デプロイの詳細
- `docs/gcp-current-permissions.md` – GCP IAMロールと権限整理
