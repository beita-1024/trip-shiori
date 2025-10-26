# ===== VPC設定 =====
resource "google_compute_network" "main" {
  name                    = "${var.project_name}-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "main" {
  name                     = "${var.project_name}-subnet"
  ip_cidr_range            = var.subnet_cidr
  region                   = var.region
  network                  = google_compute_network.main.id
  private_ip_google_access = true
}

# ===== DNS設定（Direct VPC Egress用） =====
resource "google_dns_managed_zone" "cloud_run_dns_zone" {
  name     = "${var.project_name}-cloud-run-dns-zone"
  dns_name = "run.app."

  visibility = "private"

  private_visibility_config {
    networks {
      network_url = google_compute_network.main.id
    }
  }
}

resource "google_dns_record_set" "cloud_run_dns_record_set_a" {
  name         = "run.app."
  type         = "A"
  ttl          = 60
  managed_zone = google_dns_managed_zone.cloud_run_dns_zone.name
  rrdatas      = ["199.36.153.4", "199.36.153.5", "199.36.153.6", "199.36.153.7"] # restricted.googleapis.com
}

resource "google_dns_record_set" "cloud_run_dns_record_set_cname" {
  name         = "*.run.app."
  type         = "CNAME"
  ttl          = 60
  managed_zone = google_dns_managed_zone.cloud_run_dns_zone.name
  rrdatas      = ["run.app."]
}

# VPC peering 用 予約レンジ
resource "google_compute_global_address" "private_service_range" {
  name          = "${var.project_name}-psr"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.main.id
}

# Service Networking 接続
resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_service_range.name]
}

# ===== Cloud NAT設定（AIサービス外部APIアクセス用） =====
# 
# 目的: AIサービスから外部API（Cerebras、OpenAI、Tavily）へのアクセスを可能にする
# 
# ネットワークフロー:
# 1. AIサービス（プライベートIP）→ Cloud NAT → インターネット → 外部API
# 2. 外部API → インターネット → Cloud NAT → AIサービス
# 
# セキュリティ考慮事項:
# - AIサービスは内部からのみアクセス可能（ingress=INTERNAL_ONLY）
# - 外部からの直接アクセスは不可能
# - Cloud NATにより外部APIへのアクセスのみ可能
# - プライベートIPを使用するため、外部からAIサービスのIPは見えない
#
resource "google_compute_router" "nat_router" {
  name    = "${var.project_name}-nat-router"
  region  = var.region
  network = google_compute_network.main.id

  bgp {
    asn = 64514 # プライベートASN（Google Cloud推奨値）
  }
}

# Cloud NAT設定
# 
# 機能: プライベートIPから外部へのアクセスを可能にする
# 
# 設定詳細:
# - source_subnetwork_ip_ranges_to_nat: サブネット内のすべてのIPをNAT対象
# - nat_ip_allocate_option: 自動的に外部IPを割り当て
# - log_config: NATのログを有効化（トラブルシューティング用）
#
resource "google_compute_router_nat" "ai_nat" {
  name                               = "${var.project_name}-ai-nat"
  router                             = google_compute_router.nat_router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  # NATのログ設定（トラブルシューティング用）
  log_config {
    enable = true
    filter = "ERRORS_ONLY" # エラーのみログ出力（コスト削減）
  }
}

# ===== ファイアウォールルール（egress許可） =====
# 
# 目的: VPC内から外部へのegressトラフィックを許可
# 
# 許可するトラフィック:
# - HTTPS (443): 外部API（Cerebras、OpenAI、Tavily）へのアクセス
# - HTTP (80): リダイレクトやHTTP API用
# - DNS (53): ドメイン名解決用
# 
# セキュリティ:
# - ingressルールは追加しない（内部アクセスのみ維持）
# - 特定のポートのみ許可（全ポート開放ではない）
# - ソースIPはVPC内のプライベートIPレンジに限定
#
resource "google_compute_firewall" "allow_egress_external" {
  name    = "${var.project_name}-allow-egress-external"
  network = google_compute_network.main.name

  # egressルール（外向きトラフィック）
  direction = "EGRESS"

  # 許可するプロトコルとポート
  allow {
    protocol = "tcp"
    ports    = ["80", "443"] # HTTP, HTTPS
  }

  allow {
    protocol = "udp"
    ports    = ["53"] # DNS
  }

  # ソースIPレンジ（VPC内のプライベートIP）
  source_ranges = [var.subnet_cidr] # サブネットのCIDR

  # ターゲットタグ（必要に応じて特定のインスタンスに制限可能）
  # target_tags = ["ai-service"]  # 現在は使用していない

  # ログ設定
  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }

  description = "Allow egress traffic from VPC to external APIs (HTTPS, HTTP, DNS)"
}

# ===== VPC Connector 削除済み（Direct VPC Egressに移行） =====
