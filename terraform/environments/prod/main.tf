# ===== 本番環境用Terraform設定 =====
# GCPプロジェクト: portfolio-472821
# リージョン: asia-northeast1 (東京)

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    external = {
      source  = "hashicorp/external"
      version = "~> 2.0"
    }
  }
}

# ===== Git SHA取得 =====
data "external" "git_info" {
  program = ["bash", "-c", "echo '{\"sha\":\"'$(git rev-parse HEAD)'\",\"short_sha\":\"'$(git rev-parse --short HEAD)'\"}'"]
}

# GCPプロバイダー設定
provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# ===== サービス用ランダムID =====
resource "random_id" "service_suffix" {
  byte_length = 4
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# ===== Secret Manager モジュール =====
module "secrets" {
  source = "../../modules/secrets"

  project_id   = var.project_id
  project_name = var.project_name
  environment  = "prod"

  # Ensure SA exists before the module binds IAM on secrets
  depends_on = [
    module.iam
  ]
}

# ===== Secret Manager データソース =====
data "google_secret_manager_secret_version" "database_password" {
  secret = module.secrets.secret_ids.database_password

  depends_on = [module.secrets]
}

# ===== Network モジュール =====
module "network" {
  source = "../../modules/network"

  project_id   = var.project_id
  project_name = var.project_name
  region       = var.region
  subnet_cidr  = "10.0.0.0/24"
}

# ===== Database モジュール =====
module "database" {
  source = "../../modules/database"

  project_id        = var.project_id
  project_name      = var.project_name
  region            = var.region
  database_name     = var.database_name
  database_user     = var.database_user
  database_password = data.google_secret_manager_secret_version.database_password.secret_data

  # Prod環境用設定
  database_tier         = "db-g1-small" # 本番環境用（より高性能）
  disk_size             = 10            # コスト削減: テキストデータのみのため最小サイズ
  disk_type             = "PD_SSD"      # 本番環境では高性能SSDを維持
  backup_retention_days = 7             # コスト削減: 30日→7日（約77%削減）
  deletion_protection   = false         # TODO: 開発中なので一時的にfalseにしておく、リリース時にtrueにする。

  # Prod環境用SQL文ログ設定（パフォーマンス重視）
  log_statement                = "mod"  # DDLとMOD文のみログ（SELECT文は除外）
  log_min_duration_statement  = 1000   # 1秒以上かかるクエリのみログ

  network_id             = module.network.network_id
  private_vpc_connection = module.network.private_vpc_connection_name
  secrets_module         = module.secrets
}

# ===== Storage モジュール =====
module "storage" {
  source = "../../modules/storage"

  project_id    = var.project_id
  project_name  = var.project_name
  region        = var.region
  bucket_suffix = random_id.bucket_suffix.hex

  # Prod環境用設定
  force_destroy = false # 本番環境では安全のため無効
  cors_origins  = ["https://app.trip.beita.dev"] # 固定値を使用
}

# ===== IAM モジュール =====
module "iam" {
  source = "../../modules/iam"

  project_id   = var.project_id
  project_name = var.project_name

  # Cloud Runサービス名
  backend_service_name      = "${var.project_name}-backend"
  backend_service_location  = var.region
  ai_service_name           = "${var.project_name}-ai"
  ai_service_location       = var.region
  frontend_service_name     = "${var.project_name}-frontend"
  frontend_service_location = var.region
  
  # Cloud Runサービスへの依存関係（循環依存を避けるため一時的に無効化）
  backend_service_dependency  = null
  frontend_service_dependency = null
  ai_service_dependency       = null
}

# ===== Cloud Run モジュール =====
module "cloudrun" {
  source = "../../modules/cloudrun"

  project_id   = var.project_id
  project_name = var.project_name
  region       = var.region
  git_sha      = data.external.git_info.result.short_sha

  # Prod環境用リソース設定
  cpu_limit                   = "2"
  memory_limit                = "1Gi"
  min_instance_count          = 1
  max_instance_count_backend  = 20
  max_instance_count_ai       = 20
  max_instance_count_frontend = 20

  # ネットワーク設定
  network_id    = module.network.network_id
  subnetwork_id = module.network.subnetwork_id

  # サービスアカウント
  backend_sa_email  = module.iam.backend_sa_email
  ai_sa_email       = module.iam.ai_sa_email
  frontend_sa_email = module.iam.frontend_sa_email

  # データベース設定
  database_name          = var.database_name
  database_user          = var.database_user
  database_private_ip    = module.database.private_ip_address
  database_instance      = module.database.instance_id
  database_database      = module.database.database_name
  database_user_resource = module.database.user_name

  # Secret Manager設定
  secrets = module.secrets.secret_ids

  # アプリケーション設定
  app_name     = var.app_name
  api_url      = "https://api.trip.beita.dev"
  frontend_url = "https://app.trip.beita.dev"

  # JWT設定
  jwt_access_expires_in  = var.jwt_access_expires_in
  jwt_refresh_expires_in = var.jwt_refresh_expires_in

  # SMTP設定
  smtp_host   = var.smtp_host
  smtp_port   = var.smtp_port
  smtp_secure = var.smtp_secure

  # AI/LLM設定
  openai_model       = var.openai_model
  openai_temperature = var.openai_temperature
  llm_timeout_sec    = var.llm_timeout_sec

  depends_on = [
    module.network,
    module.database,
    module.iam,
    module.secrets
  ]
}

# ===== Cloud Run IAM設定（循環依存を避けるため別途定義） =====
resource "google_cloud_run_v2_service_iam_member" "backend_noauth" {
  location = var.region
  name     = "${var.project_name}-backend"
  role     = "roles/run.invoker"
  member   = "allUsers"
  
  depends_on = [module.cloudrun]
}

resource "google_cloud_run_v2_service_iam_member" "frontend_noauth" {
  location = var.region
  name     = "${var.project_name}-frontend"
  role     = "roles/run.invoker"
  member   = "allUsers"
  
  depends_on = [module.cloudrun]
}

resource "google_cloud_run_v2_service_iam_member" "ai_invoker_from_backend" {
  location = var.region
  name     = "${var.project_name}-ai"
  role     = "roles/run.invoker"
  member   = "serviceAccount:${module.iam.backend_sa_email}"
  
  depends_on = [module.cloudrun]
}
