# Terraform状態をGCSで管理
terraform {
  backend "gcs" {
    bucket = "trip-shiori-terraform-state"
    prefix = "prod"
  }
}
