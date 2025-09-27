# ===== 開発環境用変数定義 =====

variable "project_id" {
  description = "GCPプロジェクトID"
  type        = string
  default     = "portfolio-472821"
}

variable "project_name" {
  description = "プロジェクト名（リソース名のプレフィックス）"
  type        = string
  default     = "trip-shiori-dev"
}

variable "region" {
  description = "GCPリージョン"
  type        = string
  default     = "asia-northeast1"
}

variable "zone" {
  description = "GCPゾーン"
  type        = string
  default     = "asia-northeast1-a"
}

variable "database_name" {
  description = "データベース名"
  type        = string
  default     = "trip_shiori"
}

variable "database_user" {
  description = "データベースユーザー名"
  type        = string
  default     = "trip_shiori_user"
}

variable "database_password" {
  description = "データベースパスワード"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT署名用シークレット"
  type        = string
  sensitive   = true
}

variable "jwt_access_expires_in" {
  description = "JWTアクセストークンの有効期限"
  type        = string
  default     = "120m"
}

variable "jwt_refresh_expires_in" {
  description = "JWTリフレッシュトークンの有効期限"
  type        = string
  default     = "30d"
}

variable "backend_image" {
  description = "Backend用Dockerイメージ"
  type        = string
  default     = "gcr.io/portfolio-472821/trip-shiori-backend:latest"
}

variable "frontend_image" {
  description = "Frontend用Dockerイメージ"
  type        = string
  default     = "gcr.io/portfolio-472821/trip-shiori-frontend:latest"
}

variable "app_name" {
  description = "アプリケーション名"
  type        = string
  default     = "Trip Shiori"
}

# ===== SMTP設定 =====
variable "smtp_host" {
  description = "SMTPホスト"
  type        = string
  default     = ""
}

variable "smtp_port" {
  description = "SMTPポート"
  type        = string
  default     = "587"
}

variable "smtp_user" {
  description = "SMTPユーザー名"
  type        = string
  default     = ""
}

variable "smtp_password" {
  description = "SMTPパスワード"
  type        = string
  sensitive   = true
  default     = ""
}

variable "smtp_secure" {
  description = "SMTPセキュア接続"
  type        = string
  default     = "false"
}

variable "openai_api_key" {
  description = "OpenAI APIキー"
  type        = string
  sensitive   = true
  default     = ""
}
