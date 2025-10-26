# ===== Cloud Run (Backend) =====
# 課金額削減のため min_instance_count = 0, cpu_idle = true を設定
resource "google_cloud_run_v2_service" "backend" {
  name     = "${var.project_name}-backend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL" # 外部からのアクセスを許可

  depends_on = [
    var.database_instance,
    var.database_database,
    var.database_user
  ]

  template {
    service_account = var.backend_sa_email
    containers {
      image = "gcr.io/${var.project_id}/trip-shiori-backend:${var.git_sha}"

      ports {
        container_port = 3000
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      # データベース接続設定（個別環境変数で設定、entrypoint.shでDATABASE_URLを構築）
      # SSL接続を必須化（ssl_mode = "REQUIRE"に対応）
      # 接続の流れ: Cloud Run → VPC Connector → Cloud SQL (Private IP with SSL)
      # セキュリティ: VPC内通信 + SSL暗号化で二重のセキュリティ確保
      env {
        name = "DATABASE_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = var.secrets.database_password
            version = "latest"
          }
        }
      }

      env {
        name  = "DATABASE_HOST"
        value = var.database_private_ip
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
        name  = "DATABASE_SSL_MODE"
        value = "require"
      }

      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = var.secrets.jwt_secret
            version = "latest"
          }
        }
      }

      env {
        name = "REFRESH_TOKEN_FINGERPRINT_SECRET"
        value_source {
          secret_key_ref {
            secret  = var.secrets.refresh_token_fingerprint_secret
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
            secret  = var.secrets.smtp_user
            version = "latest"
          }
        }
      }

      env {
        name = "SMTP_PASS"
        value_source {
          secret_key_ref {
            secret  = var.secrets.smtp_password
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
        value = var.frontend_url
      }

      env {
        name = "OPENAI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = var.secrets.openai_api_key
            version = "latest"
          }
        }
      }

      # ===== AI/LLM設定 =====
      env {
        name = "INTERNAL_AI_TOKEN"
        value_source {
          secret_key_ref {
            secret  = var.secrets.internal_ai_token
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
            secret  = var.secrets.cerebras_api_key
            version = "latest"
          }
        }
      }

      env {
        name = "TAVILY_API_KEY"
        value_source {
          secret_key_ref {
            secret  = var.secrets.tavily_api_key
            version = "latest"
          }
        }
      }

      resources {
        limits = {
          cpu    = var.cpu_limit
          memory = var.memory_limit
        }
        cpu_idle = true # CPU throttled設定（課金額削減対応）
      }

      startup_probe {
        tcp_socket {
          port = 3000
        }
        initial_delay_seconds = 30
        timeout_seconds       = 10
        period_seconds        = 10
        failure_threshold     = 30
      }
    }

    scaling {
      min_instance_count = var.min_instance_count
      max_instance_count = var.max_instance_count_backend
    }

    vpc_access {
      egress = "PRIVATE_RANGES_ONLY"
      network_interfaces {
        network    = var.network_id
        subnetwork = var.subnetwork_id
      }
    }

    timeout = "600s" # 10分のタイムアウト
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
  ingress  = "INGRESS_TRAFFIC_INTERNAL_ONLY" # VPC内部からのみアクセス可能

  template {
    service_account = var.ai_sa_email
    containers {
      image = "gcr.io/${var.project_id}/trip-shiori-ai:${var.git_sha}"

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
            secret  = var.secrets.openai_api_key
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
            secret  = var.secrets.internal_ai_token
            version = "latest"
          }
        }
      }

      env {
        name = "CEREBRAS_API_KEY"
        value_source {
          secret_key_ref {
            secret  = var.secrets.cerebras_api_key
            version = "latest"
          }
        }
      }

      env {
        name = "TAVILY_API_KEY"
        value_source {
          secret_key_ref {
            secret  = var.secrets.tavily_api_key
            version = "latest"
          }
        }
      }

      resources {
        limits = {
          cpu    = var.cpu_limit
          memory = var.memory_limit
        }
        cpu_idle = true # CPU throttled設定（課金額削減対応）
      }
    }

    scaling {
      min_instance_count = var.min_instance_count
      max_instance_count = var.max_instance_count_ai
    }

    # VPCアクセス設定（Direct VPC Egress）
    # egress = "ALL_TRAFFIC" で外部API（OpenAI、Cerebras、Tavily）へのアクセスを許可
    vpc_access {
      egress = "ALL_TRAFFIC"
      network_interfaces {
        network    = var.network_id
        subnetwork = var.subnetwork_id
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
  ingress  = "INGRESS_TRAFFIC_ALL" # 外部からのアクセスを許可

  template {
    service_account = var.frontend_sa_email
    containers {
      image = "gcr.io/${var.project_id}/trip-shiori-frontend:${var.git_sha}"

      ports {
        container_port = 3000
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = var.api_url
      }

      env {
        name  = "NEXT_PUBLIC_FRONTEND_URL"
        value = var.frontend_url
      }

      env {
        name  = "NEXT_PUBLIC_APP_NAME"
        value = var.app_name
      }

      resources {
        limits = {
          cpu    = var.cpu_limit
          memory = var.memory_limit
        }
        cpu_idle = true # CPU throttled設定（課金額削減対応）
      }
    }

    scaling {
      min_instance_count = var.min_instance_count
      max_instance_count = var.max_instance_count_frontend
    }

    # VPCアクセス設定（Direct VPC Egress）
    vpc_access {
      egress = "PRIVATE_RANGES_ONLY"
      network_interfaces {
        network    = var.network_id
        subnetwork = var.subnetwork_id
      }
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}
