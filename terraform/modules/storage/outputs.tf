# ===== Storage モジュール出力 =====

output "bucket_name" {
  description = "Cloud Storageバケット名"
  value       = google_storage_bucket.static.name
}

output "bucket_url" {
  description = "Cloud StorageバケットURL"
  value       = google_storage_bucket.static.url
}

output "bucket_self_link" {
  description = "Cloud Storageバケットのセルフリンク"
  value       = google_storage_bucket.static.self_link
}
