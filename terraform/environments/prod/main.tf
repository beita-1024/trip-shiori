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
  name          = "${var.project_name}-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.main.id
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
resource "google_sql_database_instance" "main" {
  name             = "${var.project_name}-db-instance"
  database_version = "POSTGRES_16"
  region           = var.region

  depends_on = [google_service_networking_connection.private_vpc_connection]

  settings {
    tier = "db-g1-small"  # 本番環境用（より高性能）
    
    disk_size = 100
    disk_type = "PD_SSD"
    
    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 30
        retention_unit   = "COUNT"
      }
    }

    ip_configuration {
      ipv4_enabled   = false
      private_network = google_compute_network.main.id
      # Private Service Connect によりプライベート到達を確保
    }
  }

  deletion_protection = true   # 本番環境では削除保護を有効（データ保護）

  # lifecycle.ignore_changes を削除してTerraform管理下に戻す
}

resource "google_sql_database" "main" {
  name     = var.database_name
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "main" {
  name     = var.database_user
  instance = google_sql_database_instance.main.name
  password = var.database_password
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

# ===== サービス用ランダムID =====
resource "random_id" "service_suffix" {
  byte_length = 4
}

# ===== Cloud Run (Backend) =====
resource "google_cloud_run_v2_service" "backend" {
  name     = "${var.project_name}-backend"
  location = var.region

  depends_on = [
    google_sql_database_instance.main,
    google_sql_database.main,
    google_sql_user.main
  ]

  template {
    containers {
      image = "gcr.io/${var.project_id}/trip-shiori-backend:${data.external.git_info.result.short_sha}"
      
      ports {
        container_port = 3000
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      
      # Private IP を参照（type == "PRIVATE" を抽出）
      env {
        name  = "DATABASE_URL"
        value = "postgresql://${var.database_user}:${var.database_password}@${[for ip in google_sql_database_instance.main.ip_address : ip.ip_address if ip.type == "PRIVATE"][0]}:5432/${var.database_name}?sslmode=require"
      }
      
      env {
        name  = "JWT_SECRET"
        value = var.jwt_secret
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
        name  = "SMTP_USER"
        value = var.smtp_user
      }
      
      env {
        name  = "SMTP_PASS"
        value = var.smtp_password
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
        name  = "OPENAI_API_KEY"
        value = var.openai_api_key
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
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
      min_instance_count = 1  # 本番環境では常時起動
      max_instance_count = 100
    }

    vpc_access {
      connector = google_vpc_access_connector.main.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    timeout = "600s"  # 10分のタイムアウト
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}

# ===== Cloud Run (Frontend) =====
resource "google_cloud_run_v2_service" "frontend" {
  name     = "${var.project_name}-frontend"
  location = var.region

  template {
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
      }
    }

    scaling {
      min_instance_count = 1  # 本番環境では常時起動
      max_instance_count = 50
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}

# ===== VPC Connector (Cloud Run ↔ Cloud SQL接続用) =====
resource "google_vpc_access_connector" "main" {
  name          = "${var.project_name}connector"
  ip_cidr_range = "10.8.0.0/28"
  network       = google_compute_network.main.name
  region        = var.region
}

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