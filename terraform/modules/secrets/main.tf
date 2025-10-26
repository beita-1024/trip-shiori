# ===== Secret Manager モジュール =====
# 既存のSecret Managerシークレットを参照し、Cloud Runサービスにアクセス権限を付与

# 既存のSecret Managerシークレットを参照
data "google_secret_manager_secret" "database_password" {
  secret_id = "trip-shiori-${var.environment}-database-password"
  project   = var.project_id
}

data "google_secret_manager_secret" "jwt_secret" {
  secret_id = "trip-shiori-${var.environment}-jwt-secret"
  project   = var.project_id
}

data "google_secret_manager_secret" "smtp_user" {
  secret_id = "trip-shiori-${var.environment}-smtp-user"
  project   = var.project_id
}

data "google_secret_manager_secret" "smtp_password" {
  secret_id = "trip-shiori-${var.environment}-smtp-password"
  project   = var.project_id
}

data "google_secret_manager_secret" "openai_api_key" {
  secret_id = "trip-shiori-${var.environment}-openai-api-key"
  project   = var.project_id
}

data "google_secret_manager_secret" "internal_ai_token" {
  secret_id = "trip-shiori-${var.environment}-internal-ai-token"
  project   = var.project_id
}

data "google_secret_manager_secret" "cerebras_api_key" {
  secret_id = "trip-shiori-${var.environment}-cerebras-api-key"
  project   = var.project_id
}

data "google_secret_manager_secret" "tavily_api_key" {
  secret_id = "trip-shiori-${var.environment}-tavily-api-key"
  project   = var.project_id
}

data "google_secret_manager_secret" "refresh_token_fingerprint_secret" {
  secret_id = "trip-shiori-${var.environment}-refresh-token-fingerprint-secret"
  project   = var.project_id
}

# Cloud RunサービスアカウントにSecret Managerアクセス権限を付与
locals {
  # デフォルトのCloud Runサービス名
  default_services = [
    "${var.project_name}-backend",
    "${var.project_name}-ai",
    "${var.project_name}-frontend"
  ]

  # 指定されたサービス名とデフォルトをマージ
  all_services = distinct(concat(local.default_services, var.cloud_run_services))

  # シークレット一覧
  secrets = [
    data.google_secret_manager_secret.database_password,
    data.google_secret_manager_secret.jwt_secret,
    data.google_secret_manager_secret.smtp_user,
    data.google_secret_manager_secret.smtp_password,
    data.google_secret_manager_secret.openai_api_key,
    data.google_secret_manager_secret.internal_ai_token,
    data.google_secret_manager_secret.cerebras_api_key,
    data.google_secret_manager_secret.tavily_api_key
  ]
}

# 各Cloud Runサービスアカウントに各シークレットへのアクセス権限を付与
resource "google_secret_manager_secret_iam_member" "secret_access" {
  for_each = {
    for combo in setproduct(local.all_services, local.secrets) :
    "${combo[0]}-${combo[1].secret_id}" => {
      service = combo[0]
      secret  = combo[1]
    }
  }

  secret_id = each.value.secret.secret_id
  project   = var.project_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${each.value.service}@${var.project_id}.iam.gserviceaccount.com"
}

# バックエンドのみに指紋シークレットへのアクセス権限を付与
resource "google_secret_manager_secret_iam_member" "refresh_fp_backend_only" {
  secret_id = data.google_secret_manager_secret.refresh_token_fingerprint_secret.secret_id
  project   = var.project_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.project_name}-backend@${var.project_id}.iam.gserviceaccount.com"
}
