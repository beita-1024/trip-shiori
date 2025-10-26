# ===== Storage モジュール変数定義 =====

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

variable "bucket_suffix" {
  description = "バケット名のサフィックス"
  type        = string
}

variable "force_destroy" {
  description = "バケットの強制削除を許可するか"
  type        = bool
}

variable "cors_origins" {
  description = "CORS許可オリジン"
  type        = list(string)
  default     = ["*"]
}

variable "lifecycle_age_days" {
  description = "ライフサイクルルールの年齢（日数）"
  type        = number
  default     = 30
}
