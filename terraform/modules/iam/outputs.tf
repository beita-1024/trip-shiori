# ===== IAM モジュール出力 =====

output "backend_sa_email" {
  description = "Backendサービスアカウントのメールアドレス"
  value       = google_service_account.backend.email
}

output "backend_sa_id" {
  description = "BackendサービスアカウントのID"
  value       = google_service_account.backend.id
}

output "ai_sa_email" {
  description = "AIサービスアカウントのメールアドレス"
  value       = google_service_account.ai.email
}

output "ai_sa_id" {
  description = "AIサービスアカウントのID"
  value       = google_service_account.ai.id
}

output "frontend_sa_email" {
  description = "Frontendサービスアカウントのメールアドレス"
  value       = google_service_account.frontend.email
}

output "frontend_sa_id" {
  description = "FrontendサービスアカウントのID"
  value       = google_service_account.frontend.id
}
