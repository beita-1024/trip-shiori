# ===== Secret Manager モジュール変数定義 =====

variable "project_id" {
  description = "GCPプロジェクトID"
  type        = string
}

variable "project_name" {
  description = "プロジェクト名（リソース名のプレフィックス）"
  type        = string
}

variable "environment" {
  description = "環境名（dev/prod）"
  type        = string
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "Environment must be either 'dev' or 'prod'."
  }
}

variable "cloud_run_services" {
  description = "Secret Managerアクセス権限を付与するCloud Runサービス名のリスト"
  type        = list(string)
  default     = []
}
