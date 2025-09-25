# ===== 本番環境用出力定義 =====

output "backend_url" {
  description = "Backend Cloud Run URL (custom domain)"
  value       = "https://api.trip.beita.dev"
}

output "frontend_url" {
  description = "Frontend Cloud Run URL (custom domain)"
  value       = "https://app.trip.beita.dev"
}

output "database_connection_name" {
  description = "Cloud SQL接続名"
  value       = google_sql_database_instance.main.connection_name
}

output "database_private_ip" {
  description = "Cloud SQLプライベートIP"
  value       = google_sql_database_instance.main.private_ip_address
}

output "static_bucket_name" {
  description = "静的ファイル用Storageバケット名"
  value       = google_storage_bucket.static.name
}

output "vpc_connector_name" {
  description = "VPC Connector名"
  value       = google_vpc_access_connector.main.name
}
