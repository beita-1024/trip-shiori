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
  value       = module.database.connection_name
}

output "database_private_ip" {
  description = "Cloud SQLプライベートIP"
  value       = module.database.private_ip_address
}

output "static_bucket_name" {
  description = "静的ファイル用Storageバケット名"
  value       = module.storage.bucket_name
}

output "vpc_network_name" {
  description = "VPCネットワーク名（Direct VPC Egress使用）"
  value       = module.network.network_name
}

output "vpc_subnetwork_name" {
  description = "VPCサブネット名（Direct VPC Egress使用）"
  value       = module.network.subnetwork_name
}

output "dns_managed_zone_name" {
  description = "Cloud Run用DNS Managed Zone名"
  value       = module.network.dns_zone_name
}
