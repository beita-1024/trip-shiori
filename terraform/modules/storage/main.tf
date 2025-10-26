# ===== Cloud Storage (静的ファイル用) =====
resource "google_storage_bucket" "static" {
  name          = "${var.project_name}-static-${var.bucket_suffix}"
  location      = var.region
  force_destroy = var.force_destroy

  uniform_bucket_level_access = true
  public_access_prevention   = "enforced"

  cors {
    origin          = var.cors_origins
    method          = ["GET", "HEAD"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  lifecycle_rule {
    condition {
      age = var.lifecycle_age_days
    }
    action {
      type = "Delete"
    }
  }
}
