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
        value = "https://dev-api.trip.beita.dev"
      }

      env {
        name  = "NEXT_PUBLIC_FRONTEND_URL"
        value = "https://dev-app.trip.beita.dev"
      }

      env {
        name  = "NEXT_PUBLIC_APP_NAME"
        value = var.app_name
      }

      env {
        name  = "NEXT_PUBLIC_VERSION"
        value = "1.0.0"
      }

      env {
        name  = "NEXT_PUBLIC_DEBUG"
        value = "false"
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
        cpu_idle = true # CPU throttled設定（課金額削減対応）
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 10
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
