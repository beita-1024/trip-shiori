# ===== Cloud SQL (PostgreSQL) =====
# コスト最適化設定:
# - ディスクサイズ: 100GB → 10GB (90%削減)
# - ディスクタイプ: PD_SSD維持（本番環境では高性能を優先）
# - バックアップ保持: 30日 → 7日 (約77%削減)
# テキストデータのみのため、最小限のリソースで十分
resource "google_sql_database_instance" "main" {
  name             = "${var.project_name}-db-instance"
  database_version = "POSTGRES_16"
  region           = var.region

  depends_on = [google_service_networking_connection.private_vpc_connection]

  settings {
    tier = "db-g1-small" # 本番環境用（より高性能）

    # コスト削減: テキストデータのみのため最小ディスクサイズに変更
    # disk_size = 100  # 元の設定（コメントアウト）
    disk_size = 10       # コスト削減: テキストデータのみのため最小サイズ
    disk_type = "PD_SSD" # 本番環境では高性能SSDを維持
    # disk_type = "PD_STANDARD"  # コスト削減案（コメントアウト）

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      # コスト削減: バックアップ保持期間を30日から7日に短縮（約77%削減）
      # backup_retention_settings {
      #   retained_backups = 30  # 元の設定（コメントアウト）
      #   retention_unit   = "COUNT"
      # }
      backup_retention_settings {
        retained_backups = 7 # コスト削減: 30日→7日（約77%削減）
        retention_unit   = "COUNT"
      }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.main.id
      # Private Service Connect によりプライベート到達を確保
    }
  }

  # deletion_protection = true   # 本番環境では削除保護を有効（データ保護）
  # TODO: 開発中なので一時的にfalseにしておく、リリース時にtrueにする。
  deletion_protection = false

  # lifecycle.ignore_changes を削除してTerraform管理下に戻す
}

resource "google_sql_database" "main" {
  name     = var.database_name
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "main" {
  name     = var.database_user
  instance = google_sql_database_instance.main.name
  password = data.google_secret_manager_secret_version.database_password.secret_data

  depends_on = [module.secrets]
}
