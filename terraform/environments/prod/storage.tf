# ===== Cloud Storage (静的ファイル用) =====
resource "google_storage_bucket" "static" {
  name          = "${var.project_name}-static-${random_id.bucket_suffix.hex}"
  location      = var.region
  force_destroy = false # 本番環境では安全のため無効

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
