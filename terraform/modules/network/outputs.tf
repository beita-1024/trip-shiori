# ===== Network モジュール出力 =====

output "network_id" {
  description = "VPCネットワークID"
  value       = google_compute_network.main.id
}

output "network_name" {
  description = "VPCネットワーク名"
  value       = google_compute_network.main.name
}

output "subnetwork_id" {
  description = "サブネットワークID"
  value       = google_compute_subnetwork.main.id
}

output "subnetwork_name" {
  description = "サブネットワーク名"
  value       = google_compute_subnetwork.main.name
}

output "dns_zone_name" {
  description = "DNS Managed Zone名"
  value       = google_dns_managed_zone.cloud_run_dns_zone.name
}

output "private_service_range_name" {
  description = "Private Service Range名"
  value       = google_compute_global_address.private_service_range.name
}

output "private_vpc_connection_name" {
  description = "Private VPC Connection名"
  value       = google_service_networking_connection.private_vpc_connection.network
}
