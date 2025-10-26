# ===== Secret Manager モジュール =====
module "secrets" {
  source = "../../modules/secrets"

  project_id   = var.project_id
  project_name = var.project_name
  environment  = "prod"

  # Ensure SA exists before the module binds IAM on secrets
  depends_on = [
    google_service_account.backend,
    google_service_account.ai,
    google_service_account.frontend,
  ]
}

# ===== Secret Manager データソース =====
data "google_secret_manager_secret_version" "database_password" {
  secret = module.secrets.secret_ids.database_password

  depends_on = [module.secrets]
}
