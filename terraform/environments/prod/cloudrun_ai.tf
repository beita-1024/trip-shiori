# ===== Cloud Run (AI Service) =====
# 課金額削減のため min_instance_count = 0, cpu_idle = true を設定
resource "google_cloud_run_v2_service" "ai" {
  name     = "${var.project_name}-ai"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_ONLY" # VPC内部からのみアクセス可能

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
        cpu_idle = true # CPU throttled設定（課金額削減対応）
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
