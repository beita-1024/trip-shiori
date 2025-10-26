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

# ===== サービス用ランダムID =====
resource "random_id" "service_suffix" {
  byte_length = 4
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}
