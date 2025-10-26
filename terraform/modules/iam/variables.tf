# ===== IAM モジュール変数定義 =====

variable "project_id" {
  description = "GCPプロジェクトID"
  type        = string
}

variable "project_name" {
  description = "プロジェクト名（リソース名のプレフィックス）"
  type        = string
}

variable "backend_service_name" {
  description = "Backend Cloud Runサービス名"
  type        = string
}

variable "backend_service_location" {
  description = "Backend Cloud Runサービスロケーション"
  type        = string
}

variable "ai_service_name" {
  description = "AI Cloud Runサービス名"
  type        = string
}

variable "ai_service_location" {
  description = "AI Cloud Runサービスロケーション"
  type        = string
}

variable "frontend_service_name" {
  description = "Frontend Cloud Runサービス名"
  type        = string
}

variable "frontend_service_location" {
  description = "Frontend Cloud Runサービスロケーション"
  type        = string
}

# ===== 依存関係変数 =====
variable "backend_service_dependency" {
  description = "Backend Cloud Runサービスの依存関係"
  type        = any
  default     = null
}

variable "frontend_service_dependency" {
  description = "Frontend Cloud Runサービスの依存関係"
  type        = any
  default     = null
}

variable "ai_service_dependency" {
  description = "AI Cloud Runサービスの依存関係"
  type        = any
  default     = null
}
