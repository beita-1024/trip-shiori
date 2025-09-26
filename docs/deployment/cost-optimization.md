# コスト最適化設定

## 概要

課金額削減のため、両方の環境（本番・開発）でCloud Runのコスト最適化設定を適用しています。

## 適用された設定

### 1. 最小インスタンス数の削減
- **本番環境**: `min_instance_count = 0`（従来: 1）
- **開発環境**: `min_instance_count = 0`（既存設定を維持）

### 2. CPU Throttled設定
- **両環境**: `cpu_idle = true`を追加
- リクエストがない場合のCPU使用量を大幅削減

## 設定詳細

### 本番環境（prod）
```hcl
scaling {
  min_instance_count = 0  # コスト削減のため常時起動を停止（課金額削減対応）
  max_instance_count = 100
}

resources {
  limits = {
    cpu    = "2"
    memory = "1Gi"
  }
  cpu_idle = true  # CPU throttled設定（課金額削減対応）
}
```

### 開発環境（dev）
```hcl
scaling {
  min_instance_count = 0
  max_instance_count = 10
}

resources {
  limits = {
    cpu    = "1"
    memory = "1Gi"
  }
  cpu_idle = true  # CPU throttled設定（課金額削減対応）
}
```

## 影響と注意事項

### メリット
- **大幅なコスト削減**: 常時起動インスタンスの削除により、月額コストを大幅削減
- **CPU使用量削減**: アイドル時のCPU使用量を最小限に抑制

### デメリット・注意点
- **コールドスタート**: 初回リクエスト時に起動時間が発生（通常5-10秒）
- **レスポンス時間**: アイドル状態からの復帰時に若干の遅延が発生する可能性

### 推奨事項
- 本格運用時は、必要に応じて`min_instance_count`を1に戻すことを検討
- モニタリングでレスポンス時間を監視し、必要に応じて設定を調整

## 設定ファイル

- 本番環境: `terraform/environments/prod/main.tf`
- 開発環境: `terraform/environments/dev/main.tf`

## 更新日時

- 2025-01-15: コスト最適化設定を適用

---

_Last updated: 2025-01-15_
