# ===== Database モジュール出力 =====

output "instance_name" {
  description = "Cloud SQLインスタンス名"
  value       = google_sql_database_instance.main.name
}

output "instance_id" {
  description = "Cloud SQLインスタンスID"
  value       = google_sql_database_instance.main.id
}

output "private_ip_address" {
  description = "Cloud SQLプライベートIP"
  value       = google_sql_database_instance.main.private_ip_address
}

output "connection_name" {
  description = "Cloud SQL接続名"
  value       = google_sql_database_instance.main.connection_name
}

output "database_name" {
  description = "データベース名"
  value       = google_sql_database.main.name
}

output "user_name" {
  description = "データベースユーザー名"
  value       = google_sql_user.main.name
}
