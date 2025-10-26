# ===== Database モジュール変数定義 =====

variable "project_id" {
  description = "GCPプロジェクトID"
  type        = string
}

variable "project_name" {
  description = "プロジェクト名（リソース名のプレフィックス）"
  type        = string
}

variable "region" {
  description = "GCPリージョン"
  type        = string
}

variable "database_name" {
  description = "データベース名"
  type        = string
}

variable "database_user" {
  description = "データベースユーザー名"
  type        = string
}

variable "database_password" {
  description = "データベースパスワード"
  type        = string
  sensitive   = true
}

variable "database_tier" {
  description = "Cloud SQLインスタンスのティア"
  type        = string
}

variable "disk_size" {
  description = "ディスクサイズ（GB）"
  type        = number
}

variable "disk_type" {
  description = "ディスクタイプ"
  type        = string
  default     = "PD_SSD"
}

variable "backup_retention_days" {
  description = "バックアップ保持日数"
  type        = number
  default     = 7
}

variable "deletion_protection" {
  description = "削除保護の有効/無効"
  type        = bool
  default     = false
}

variable "network_id" {
  description = "VPCネットワークID"
  type        = string
}

variable "private_vpc_connection" {
  description = "Private VPC Connection（依存関係用）"
  type        = any
}

variable "secrets_module" {
  description = "Secretsモジュール（依存関係用）"
  type        = any
}
