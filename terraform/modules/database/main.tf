# ===== Cloud SQL (PostgreSQL) =====
resource "google_sql_database_instance" "main" {
  name             = "${var.project_name}-db-instance"
  database_version = "POSTGRES_16"
  region           = var.region

  depends_on = [var.private_vpc_connection]

  settings {
    tier = var.database_tier

    disk_size = var.disk_size
    disk_type = var.disk_type

    # SQL文ログ設定（環境別に調整可能）
    database_flags {
      name  = "log_statement"
      value = var.log_statement
    }

    database_flags {
      name  = "log_min_duration_statement"
      value = tostring(var.log_min_duration_statement)
    }

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = var.backup_retention_days
        retention_unit   = "COUNT"
      }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.network_id
      ssl_mode        = "ENCRYPTED_ONLY"
      # Private Service Connect によりプライベート到達を確保
    }
  }

  deletion_protection = var.deletion_protection
}

resource "google_sql_database" "main" {
  name     = var.database_name
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "main" {
  name     = var.database_user
  instance = google_sql_database_instance.main.name
  password = var.database_password

  depends_on = [var.secrets_module]

  # データベースインスタンスの削除保護と同じ設定
  # 本番環境では削除保護、開発環境では削除可能
  lifecycle {
    prevent_destroy = var.deletion_protection
  }
}
