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

# ===== IAM設定 =====
resource "google_cloud_run_v2_service_iam_member" "backend_noauth" {
  location = var.backend_service_location
  name     = var.backend_service_name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "frontend_noauth" {
  location = var.frontend_service_location
  name     = var.frontend_service_name
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
  location = var.ai_service_location
  name     = var.ai_service_name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.backend.email}"
}

## デバッグ用途（外部無認証での疎通確認）
## 注意: INTERNAL_ONLY のため外部公開はされませんが、VPC 内の任意ワークロードから呼べるようになります。
## 本番では有効化しないでください。
# resource "google_cloud_run_v2_service_iam_member" "ai_noauth" {
#   location = var.ai_service_location
#   name     = var.ai_service_name
#   role     = "roles/run.invoker"
#   member   = "allUsers"
# }

# AIサービスは内部専用のため、外部アクセス用のIAM設定を削除
