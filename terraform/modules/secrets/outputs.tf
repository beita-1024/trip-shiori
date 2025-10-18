# ===== Secret Manager モジュール出力 =====

output "secret_names" {
  description = "Secret Managerシークレット名のマップ"
  value = {
    database_password = data.google_secret_manager_secret.database_password.secret_id
    jwt_secret        = data.google_secret_manager_secret.jwt_secret.secret_id
    smtp_user         = data.google_secret_manager_secret.smtp_user.secret_id
    smtp_password     = data.google_secret_manager_secret.smtp_password.secret_id
    openai_api_key    = data.google_secret_manager_secret.openai_api_key.secret_id
    internal_ai_token = data.google_secret_manager_secret.internal_ai_token.secret_id
    cerebras_api_key  = data.google_secret_manager_secret.cerebras_api_key.secret_id
    tavily_api_key    = data.google_secret_manager_secret.tavily_api_key.secret_id
  }
}

output "secret_ids" {
  description = "Secret ManagerシークレットIDのマップ（Cloud Run環境変数で使用）"
  value = {
    database_password = data.google_secret_manager_secret.database_password.name
    jwt_secret        = data.google_secret_manager_secret.jwt_secret.name
    smtp_user         = data.google_secret_manager_secret.smtp_user.name
    smtp_password     = data.google_secret_manager_secret.smtp_password.name
    openai_api_key    = data.google_secret_manager_secret.openai_api_key.name
    internal_ai_token = data.google_secret_manager_secret.internal_ai_token.name
    cerebras_api_key  = data.google_secret_manager_secret.cerebras_api_key.name
    tavily_api_key    = data.google_secret_manager_secret.tavily_api_key.name
  }
}

output "environment" {
  description = "環境名"
  value       = var.environment
}

output "project_id" {
  description = "GCPプロジェクトID"
  value       = var.project_id
}
