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
      min_instance_count = 0 # コスト削減のため常時起動を停止（課金額削減対応）
      max_instance_count = 100
    }

    vpc_access {
      egress = "PRIVATE_RANGES_ONLY"
      network_interfaces {
        network    = google_compute_network.main.id
        subnetwork = google_compute_subnetwork.main.id
      }
    }

    timeout = "600s" # 10分のタイムアウト
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}
