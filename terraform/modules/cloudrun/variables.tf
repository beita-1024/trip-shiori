# ===== Cloud Run モジュール変数定義 =====

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

variable "git_sha" {
  description = "Git SHA（Dockerイメージタグ用）"
  type        = string
}

# リソース設定
variable "cpu_limit" {
  description = "CPU制限"
  type        = string
}

variable "memory_limit" {
  description = "メモリ制限"
  type        = string
}

variable "min_instance_count" {
  description = "最小インスタンス数"
  type        = number
  default     = 0
}

variable "max_instance_count_backend" {
  description = "Backend最大インスタンス数"
  type        = number
}

variable "max_instance_count_ai" {
  description = "AI最大インスタンス数"
  type        = number
}

variable "max_instance_count_frontend" {
  description = "Frontend最大インスタンス数"
  type        = number
}

# ネットワーク設定
variable "network_id" {
  description = "VPCネットワークID"
  type        = string
}

variable "subnetwork_id" {
  description = "サブネットワークID"
  type        = string
}

# サービスアカウント
variable "backend_sa_email" {
  description = "Backendサービスアカウントのメールアドレス"
  type        = string
}

variable "ai_sa_email" {
  description = "AIサービスアカウントのメールアドレス"
  type        = string
}

variable "frontend_sa_email" {
  description = "Frontendサービスアカウントのメールアドレス"
  type        = string
}

# データベース設定
variable "database_name" {
  description = "データベース名"
  type        = string
}

variable "database_user" {
  description = "データベースユーザー名"
  type        = string
}

variable "database_private_ip" {
  description = "データベースプライベートIP"
  type        = string
}

variable "database_instance" {
  description = "データベースインスタンス（依存関係用）"
  type        = any
}

variable "database_database" {
  description = "データベース（依存関係用）"
  type        = any
}

variable "database_user_resource" {
  description = "データベースユーザー（依存関係用）"
  type        = any
}

# Secret Manager設定
variable "secrets" {
  description = "Secret ManagerシークレットIDのマップ"
  type        = map(string)
}

# アプリケーション設定
variable "app_name" {
  description = "アプリケーション名"
  type        = string
}

variable "api_url" {
  description = "API URL"
  type        = string
}

variable "frontend_url" {
  description = "Frontend URL"
  type        = string
}

# JWT設定
variable "jwt_access_expires_in" {
  description = "JWTアクセストークンの有効期限"
  type        = string
}

variable "jwt_refresh_expires_in" {
  description = "JWTリフレッシュトークンの有効期限"
  type        = string
}

# SMTP設定
variable "smtp_host" {
  description = "SMTPホスト"
  type        = string
}

variable "smtp_port" {
  description = "SMTPポート"
  type        = string
}

variable "smtp_secure" {
  description = "SMTPセキュア接続"
  type        = string
}

# AI/LLM設定
variable "openai_model" {
  description = "使用するOpenAIモデル名"
  type        = string
}

variable "openai_temperature" {
  description = "OpenAIの温度設定"
  type        = number
}

variable "llm_timeout_sec" {
  description = "LLMタイムアウト時間（秒）"
  type        = number
}
