# ===== 開発環境用出力定義 =====

output "backend_url" {
  description = "Backend Cloud Run URL (custom domain)"
  value       = "https://dev-api.trip.beita.dev"
}

output "frontend_url" {
  description = "Frontend Cloud Run URL (custom domain)"
  value       = "https://dev-app.trip.beita.dev"
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

output "vpc_network_name" {
  description = "VPCネットワーク名（Direct VPC Egress使用）"
  value       = google_compute_network.main.name
}

output "vpc_subnetwork_name" {
  description = "VPCサブネット名（Direct VPC Egress使用）"
  value       = google_compute_subnetwork.main.name
}

output "dns_managed_zone_name" {
  description = "Cloud Run用DNS Managed Zone名"
  value       = google_dns_managed_zone.cloud_run_dns_zone.name
}
