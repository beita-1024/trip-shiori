# ===== 本番環境用Terraform設定 =====
# GCPプロジェクト: portfolio-472821
# リージョン: asia-northeast1 (東京)

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    external = {
      source  = "hashicorp/external"
      version = "~> 2.0"
    }
  }
}

# ===== Git SHA取得 =====
data "external" "git_info" {
  program = ["bash", "-c", "echo '{\"sha\":\"'$(git rev-parse HEAD)'\",\"short_sha\":\"'$(git rev-parse --short HEAD)'\"}'"]
}

# GCPプロバイダー設定
provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# ===== VPC設定 =====
resource "google_compute_network" "main" {
  name                    = "${var.project_name}-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "main" {
  name                     = "${var.project_name}-subnet"
  ip_cidr_range            = "10.0.0.0/24"
  region                   = var.region
  network                  = google_compute_network.main.id
  private_ip_google_access = true
}

# ===== DNS設定（Direct VPC Egress用） =====
resource "google_dns_managed_zone" "cloud_run_dns_zone" {
  name     = "${var.project_name}-cloud-run-dns-zone"
  dns_name = "run.app."

  visibility = "private"

  private_visibility_config {
    networks {
      network_url = google_compute_network.main.id
    }
  }
}

resource "google_dns_record_set" "cloud_run_dns_record_set_a" {
  name         = "run.app."
  type         = "A"
  ttl          = 60
  managed_zone = google_dns_managed_zone.cloud_run_dns_zone.name
  rrdatas      = ["199.36.153.4", "199.36.153.5", "199.36.153.6", "199.36.153.7"] # restricted.googleapis.com
}

resource "google_dns_record_set" "cloud_run_dns_record_set_cname" {
  name         = "*.run.app."
  type         = "CNAME"
  ttl          = 60
  managed_zone = google_dns_managed_zone.cloud_run_dns_zone.name
  rrdatas      = ["run.app."]
}

# VPC peering 用 予約レンジ
resource "google_compute_global_address" "private_service_range" {
  name          = "${var.project_name}-psr"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.main.id
}

# Service Networking 接続
resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_service_range.name]
}

# ===== Cloud SQL (PostgreSQL) =====
# コスト最適化設定:
# - ディスクサイズ: 100GB → 10GB (90%削減)
# - ディスクタイプ: PD_SSD維持（本番環境では高性能を優先）
# - バックアップ保持: 30日 → 7日 (約77%削減)
# テキストデータのみのため、最小限のリソースで十分
resource "google_sql_database_instance" "main" {
  name             = "${var.project_name}-db-instance"
  database_version = "POSTGRES_16"
  region           = var.region

  depends_on = [google_service_networking_connection.private_vpc_connection]

  settings {
    tier = "db-g1-small"  # 本番環境用（より高性能）
    
    # コスト削減: テキストデータのみのため最小ディスクサイズに変更
    # disk_size = 100  # 元の設定（コメントアウト）
    disk_size = 10     # コスト削減: テキストデータのみのため最小サイズ
    disk_type = "PD_SSD"  # 本番環境では高性能SSDを維持
    # disk_type = "PD_STANDARD"  # コスト削減案（コメントアウト）
    
    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      # コスト削減: バックアップ保持期間を30日から7日に短縮（約77%削減）
      # backup_retention_settings {
      #   retained_backups = 30  # 元の設定（コメントアウト）
      #   retention_unit   = "COUNT"
      # }
      backup_retention_settings {
        retained_backups = 7   # コスト削減: 30日→7日（約77%削減）
        retention_unit   = "COUNT"
      }
    }

    ip_configuration {
      ipv4_enabled   = false
      private_network = google_compute_network.main.id
      # Private Service Connect によりプライベート到達を確保
    }
  }

  # deletion_protection = true   # 本番環境では削除保護を有効（データ保護）
  # TODO: 開発中なので一時的にfalseにしておく、リリース時にtrueにする。
  deletion_protection = false

  # lifecycle.ignore_changes を削除してTerraform管理下に戻す
}

resource "google_sql_database" "main" {
  name     = var.database_name
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "main" {
  name     = var.database_user
  instance = google_sql_database_instance.main.name
  password = data.google_secret_manager_secret_version.database_password.secret_data
  
  depends_on = [module.secrets]
}

# ===== Cloud Storage (静的ファイル用) =====
resource "google_storage_bucket" "static" {
  name          = "${var.project_name}-static-${random_id.bucket_suffix.hex}"
  location      = var.region
  force_destroy = false  # 本番環境では安全のため無効

  uniform_bucket_level_access = true

  cors {
    origin          = ["https://${google_cloud_run_v2_service.frontend.uri}"]
    method          = ["GET", "HEAD"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# ===== Secret Manager モジュール =====
module "secrets" {
  source = "../../modules/secrets"
  
  project_id   = var.project_id
  project_name = var.project_name
  environment  = "prod"

  # Ensure SA exists before the module binds IAM on secrets
  depends_on = [
    google_service_account.backend,
    google_service_account.ai,
    google_service_account.frontend,
  ]
}

# ===== Secret Manager データソース =====
data "google_secret_manager_secret_version" "database_password" {
  secret = module.secrets.secret_ids.database_password
  
  depends_on = [module.secrets]
}

# ===== サービスアカウント =====
resource "google_service_account" "backend" {
  account_id   = "${var.project_name}-backend"
  display_name = "Backend Service Account"
  description  = "Service account for backend service"
}

resource "google_service_account" "ai" {
  account_id   = "${var.project_name}-ai"
  display_name = "AI Service Account"
  description  = "Service account for AI service"
}

resource "google_service_account" "frontend" {
  account_id   = "${var.project_name}-frontend"
  display_name = "Frontend Service Account"
  description  = "Service account for frontend service"
}

# ===== サービス用ランダムID =====
resource "random_id" "service_suffix" {
  byte_length = 4
}

# ===== Cloud Run (Backend) =====
# 課金額削減のため min_instance_count = 0, cpu_idle = true を設定
resource "google_cloud_run_v2_service" "backend" {
  name     = "${var.project_name}-backend"
  location = var.region

  depends_on = [
    google_sql_database_instance.main,
    google_sql_database.main,
    google_sql_user.main
  ]

  template {
    service_account = google_service_account.backend.email
    containers {
      image = "gcr.io/${var.project_id}/trip-shiori-backend:${data.external.git_info.result.short_sha}"
      
      ports {
        container_port = 3000
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      
      # データベース接続設定（個別環境変数で設定、entrypoint.shでDATABASE_URLを構築）
      # Private IP接続のためsslmodeは不要（Cloud SQL Private IPはTLSを提供しない）
      # 接続の流れ: Cloud Run → VPC Connector → Cloud SQL (Private IP)
      # セキュリティ: VPC内通信のため外部からの直接アクセス不可
      env {
        name = "DATABASE_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = module.secrets.secret_ids.database_password
            version = "latest"
          }
        }
      }
      
      env {
        name  = "DATABASE_HOST"
        value = google_sql_database_instance.main.private_ip_address
      }
      
      env {
        name  = "DATABASE_PORT"
        value = "5432"
      }
      
      env {
        name  = "DATABASE_NAME"
        value = var.database_name
      }
      
      env {
        name  = "DATABASE_USER"
        value = var.database_user
      }
      
      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = module.secrets.secret_ids.jwt_secret
            version = "latest"
          }
        }
      }
      
      env {
        name = "REFRESH_TOKEN_FINGERPRINT_SECRET"
        value_source {
          secret_key_ref {
            secret  = module.secrets.secret_ids.refresh_token_fingerprint_secret
            version = "latest"
          }
        }
      }
      
      env {
        name  = "JWT_ACCESS_EXPIRES_IN"
        value = var.jwt_access_expires_in
      }
      
      env {
        name  = "JWT_REFRESH_EXPIRES_IN"
        value = var.jwt_refresh_expires_in
      }
      
      env {
        name  = "SMTP_HOST"
        value = var.smtp_host
      }
      
      env {
        name  = "SMTP_PORT"
        value = var.smtp_port
      }
      
      env {
        name = "SMTP_USER"
        value_source {
          secret_key_ref {
            secret  = module.secrets.secret_ids.smtp_user
            version = "latest"
          }
        }
      }
      
      env {
        name = "SMTP_PASS"
        value_source {
          secret_key_ref {
            secret  = module.secrets.secret_ids.smtp_password
            version = "latest"
          }
        }
      }
      
      env {
        name  = "SMTP_SECURE"
        value = var.smtp_secure
      }
      
      env {
        name  = "FRONTEND_URL"
        value = "https://app.trip.beita.dev"
      }
      
      env {
        name = "OPENAI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = module.secrets.secret_ids.openai_api_key
            version = "latest"
          }
        }
      }
      
      # ===== AI/LLM設定 =====
      env {
        name = "INTERNAL_AI_TOKEN"
        value_source {
          secret_key_ref {
            secret  = module.secrets.secret_ids.internal_ai_token
            version = "latest"
          }
        }
      }
      
      env {
        name  = "INTERNAL_AI_BASE_URL"
        value = google_cloud_run_v2_service.ai.uri
      }
      
      env {
        name  = "OPENAI_MODEL"
        value = var.openai_model
      }
      
      env {
        name  = "OPENAI_TEMPERATURE"
        value = tostring(var.openai_temperature)
      }
      
      env {
        name  = "LLM_TIMEOUT_SEC"
        value = tostring(var.llm_timeout_sec)
      }
      
      # ===== 将来のAIサービス設定 =====
      env {
        name = "CEREBRAS_API_KEY"
        value_source {
          secret_key_ref {
            secret  = module.secrets.secret_ids.cerebras_api_key
            version = "latest"
          }
        }
      }
      
      env {
        name = "TAVILY_API_KEY"
        value_source {
          secret_key_ref {
            secret  = module.secrets.secret_ids.tavily_api_key
            version = "latest"
          }
        }
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
        cpu_idle = true  # CPU throttled設定（課金額削減対応）
      }

      startup_probe {
        tcp_socket {
          port = 3000
        }
        initial_delay_seconds = 30
        timeout_seconds = 10
        period_seconds = 10
        failure_threshold = 30
      }
    }

    scaling {
      min_instance_count = 0  # コスト削減のため常時起動を停止（課金額削減対応）
      max_instance_count = 100
    }

    vpc_access {
      egress = "PRIVATE_RANGES_ONLY"
      network_interfaces {
        network    = google_compute_network.main.id
        subnetwork = google_compute_subnetwork.main.id
      }
    }

    timeout = "600s"  # 10分のタイムアウト
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}

# ===== Cloud Run (AI Service) =====
# 課金額削減のため min_instance_count = 0, cpu_idle = true を設定
resource "google_cloud_run_v2_service" "ai" {
  name     = "${var.project_name}-ai"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_ONLY"  # VPC内部からのみアクセス可能

  template {
    service_account = google_service_account.ai.email
    containers {
      image = "gcr.io/${var.project_id}/trip-shiori-ai:${data.external.git_info.result.short_sha}"
      
      ports {
        container_port = 3000
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      
      env {
        name = "OPENAI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = module.secrets.secret_ids.openai_api_key
            version = "latest"
          }
        }
      }
      
      env {
        name  = "OPENAI_MODEL"
        value = var.openai_model
      }
      
      env {
        name  = "OPENAI_TEMPERATURE"
        value = tostring(var.openai_temperature)
      }
      
      env {
        name  = "LLM_TIMEOUT_SEC"
        value = tostring(var.llm_timeout_sec)
      }
      
      env {
        name = "INTERNAL_AI_TOKEN"
        value_source {
          secret_key_ref {
            secret  = module.secrets.secret_ids.internal_ai_token
            version = "latest"
          }
        }
      }
      
      env {
        name = "CEREBRAS_API_KEY"
        value_source {
          secret_key_ref {
            secret  = module.secrets.secret_ids.cerebras_api_key
            version = "latest"
          }
        }
      }
      
      env {
        name = "TAVILY_API_KEY"
        value_source {
          secret_key_ref {
            secret  = module.secrets.secret_ids.tavily_api_key
            version = "latest"
          }
        }
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
        cpu_idle = true  # CPU throttled設定（課金額削減対応）
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 100
    }

    # VPCアクセス設定（Direct VPC Egress）
    # egress = "ALL_TRAFFIC" で外部API（OpenAI、Cerebras、Tavily）へのアクセスを許可
    vpc_access {
      egress = "ALL_TRAFFIC"
      network_interfaces {
        network    = google_compute_network.main.id
        subnetwork = google_compute_subnetwork.main.id
      }
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}

# ===== Cloud Run (Frontend) =====
# 課金額削減のため min_instance_count = 0, cpu_idle = true を設定
resource "google_cloud_run_v2_service" "frontend" {
  name     = "${var.project_name}-frontend"
  location = var.region

  template {
    service_account = google_service_account.frontend.email
    containers {
      image = "gcr.io/${var.project_id}/trip-shiori-frontend:${data.external.git_info.result.short_sha}"
      
      ports {
        container_port = 3000
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      
      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = "https://api.trip.beita.dev"
      }
      
      env {
        name  = "NEXT_PUBLIC_FRONTEND_URL"
        value = "https://app.trip.beita.dev"
      }
      
      env {
        name  = "NEXT_PUBLIC_APP_NAME"
        value = var.app_name
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
        cpu_idle = true  # CPU throttled設定（課金額削減対応）
      }
    }

    scaling {
      min_instance_count = 0  # コスト削減のため常時起動を停止（課金額削減対応）
      max_instance_count = 50
    }

    # VPCアクセス設定（Direct VPC Egress）
    vpc_access {
      egress = "PRIVATE_RANGES_ONLY"
      network_interfaces {
        network    = google_compute_network.main.id
        subnetwork = google_compute_subnetwork.main.id
      }
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}

# ===== Cloud NAT設定（AIサービス外部APIアクセス用） =====
# 
# 目的: AIサービスから外部API（Cerebras、OpenAI、Tavily）へのアクセスを可能にする
# 
# ネットワークフロー:
# 1. AIサービス（プライベートIP）→ Cloud NAT → インターネット → 外部API
# 2. 外部API → インターネット → Cloud NAT → AIサービス
# 
# セキュリティ考慮事項:
# - AIサービスは内部からのみアクセス可能（ingress=INTERNAL_ONLY）
# - 外部からの直接アクセスは不可能
# - Cloud NATにより外部APIへのアクセスのみ可能
# - プライベートIPを使用するため、外部からAIサービスのIPは見えない
#
resource "google_compute_router" "nat_router" {
  name    = "${var.project_name}-nat-router"
  region  = var.region
  network = google_compute_network.main.id

  bgp {
    asn = 64514  # プライベートASN（Google Cloud推奨値）
  }
}

# Cloud NAT設定
# 
# 機能: プライベートIPから外部へのアクセスを可能にする
# 
# 設定詳細:
# - source_subnetwork_ip_ranges_to_nat: サブネット内のすべてのIPをNAT対象
# - nat_ip_allocate_option: 自動的に外部IPを割り当て
# - log_config: NATのログを有効化（トラブルシューティング用）
#
resource "google_compute_router_nat" "ai_nat" {
  name                              = "${var.project_name}-ai-nat"
  router                            = google_compute_router.nat_router.name
  region                            = var.region
  nat_ip_allocate_option            = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  # NATのログ設定（トラブルシューティング用）
  log_config {
    enable = true
    filter = "ERRORS_ONLY"  # エラーのみログ出力（コスト削減）
  }
}

# ===== ファイアウォールルール（egress許可） =====
# 
# 目的: VPC内から外部へのegressトラフィックを許可
# 
# 許可するトラフィック:
# - HTTPS (443): 外部API（Cerebras、OpenAI、Tavily）へのアクセス
# - HTTP (80): リダイレクトやHTTP API用
# - DNS (53): ドメイン名解決用
# 
# セキュリティ:
# - ingressルールは追加しない（内部アクセスのみ維持）
# - 特定のポートのみ許可（全ポート開放ではない）
# - ソースIPはVPC内のプライベートIPレンジに限定
#
resource "google_compute_firewall" "allow_egress_external" {
  name    = "${var.project_name}-allow-egress-external"
  network = google_compute_network.main.name

  # egressルール（外向きトラフィック）
  direction = "EGRESS"

  # 許可するプロトコルとポート
  allow {
    protocol = "tcp"
    ports    = ["80", "443"]  # HTTP, HTTPS
  }

  allow {
    protocol = "udp"
    ports    = ["53"]  # DNS
  }

  # ソースIPレンジ（VPC内のプライベートIP）
  source_ranges = ["10.0.0.0/24"]  # サブネットのCIDR

  # ターゲットタグ（必要に応じて特定のインスタンスに制限可能）
  # target_tags = ["ai-service"]  # 現在は使用していない

  # ログ設定
  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }

  description = "Allow egress traffic from VPC to external APIs (HTTPS, HTTP, DNS)"
}

# ===== VPC Connector 削除済み（Direct VPC Egressに移行） =====

# ===== IAM設定 =====
resource "google_cloud_run_v2_service_iam_member" "backend_noauth" {
  location = google_cloud_run_v2_service.backend.location
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "frontend_noauth" {
  location = google_cloud_run_v2_service.frontend.location
  name     = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

##
## Cloud Run (AI) Invoker 設定
##
## 運用方針:
##  - AIサービスは内部専用（ingress=INTERNAL_ONLY）
##  - Invoker は Backend のサービスアカウントのみに限定
##  - Backend→AI 呼び出し時は ID トークンを付与（audience は AI の run.app URI）
##
resource "google_cloud_run_v2_service_iam_member" "ai_invoker_from_backend" {
  location = google_cloud_run_v2_service.ai.location
  name     = google_cloud_run_v2_service.ai.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.backend.email}"
}

## デバッグ用途（外部無認証での疎通確認）
## 注意: INTERNAL_ONLY のため外部公開はされませんが、VPC 内の任意ワークロードから呼べるようになります。
## 本番では有効化しないでください。
# resource "google_cloud_run_v2_service_iam_member" "ai_noauth" {
#   location = google_cloud_run_v2_service.ai.location
#   name     = google_cloud_run_v2_service.ai.name
#   role     = "roles/run.invoker"
#   member   = "allUsers"
# }

# AIサービスは内部専用のため、外部アクセス用のIAM設定を削除