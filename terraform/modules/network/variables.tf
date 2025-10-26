# ===== Network モジュール変数定義 =====

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

variable "subnet_cidr" {
  description = "サブネットのCIDR"
  type        = string
  default     = "10.0.0.0/24"
}
