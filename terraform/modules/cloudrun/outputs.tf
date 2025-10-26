# ===== Cloud Run モジュール出力 =====

# サービスリソース（依存関係用）
output "backend_service" {
  description = "Backend Cloud Runサービスリソース"
  value       = google_cloud_run_v2_service.backend
}

output "ai_service" {
  description = "AI Cloud Runサービスリソース"
  value       = google_cloud_run_v2_service.ai
}

output "frontend_service" {
  description = "Frontend Cloud Runサービスリソース"
  value       = google_cloud_run_v2_service.frontend
}

output "backend_service_name" {
  description = "Backend Cloud Runサービス名"
  value       = google_cloud_run_v2_service.backend.name
}

output "backend_service_url" {
  description = "Backend Cloud RunサービスURL"
  value       = google_cloud_run_v2_service.backend.uri
}

output "backend_service_location" {
  description = "Backend Cloud Runサービスロケーション"
  value       = google_cloud_run_v2_service.backend.location
}

output "ai_service_name" {
  description = "AI Cloud Runサービス名"
  value       = google_cloud_run_v2_service.ai.name
}

output "ai_service_url" {
  description = "AI Cloud RunサービスURL"
  value       = google_cloud_run_v2_service.ai.uri
}

output "ai_service_location" {
  description = "AI Cloud Runサービスロケーション"
  value       = google_cloud_run_v2_service.ai.location
}

output "frontend_service_name" {
  description = "Frontend Cloud Runサービス名"
  value       = google_cloud_run_v2_service.frontend.name
}

output "frontend_service_url" {
  description = "Frontend Cloud RunサービスURL"
  value       = google_cloud_run_v2_service.frontend.uri
}

output "frontend_service_location" {
  description = "Frontend Cloud Runサービスロケーション"
  value       = google_cloud_run_v2_service.frontend.location
}
