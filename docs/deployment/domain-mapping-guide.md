# Cloud Run ドメインマッピング設定ガイド

このガイドでは、Cloud Runサービスにカスタムドメインを設定する手順を説明します。

## 概要

Cloud Runのドメインマッピングを使用して、以下のドメインを設定します：

- **開発環境**:
  - フロントエンド: `dev-app.trip.beita.dev`
  - バックエンド: `dev-api.trip.beita.dev`

- **本番環境**:
  - フロントエンド: `app.trip.beita.dev`
  - バックエンド: `api.trip.beita.dev`

## 前提条件

1. GCPプロジェクトが設定済み
2. Cloud Runサービスがデプロイ済み
3. Cloudflareでドメイン管理権限がある
4. `gcloud` CLIがインストール・認証済み
5. **親ドメインの検証完了**（重要）

## 手順

### 0. 親ドメインの検証（必須・最初に実行）

サブドメインを複数使用するため、親ドメイン `beita.dev` をGoogle Search Consoleで検証します。これにより、配下のすべてのサブドメイン（`trip.beita.dev`, `app.trip.beita.dev`, `dev-api.trip.beita.dev` など）が自動的に有効になります。

#### 手順

1. **Google Search Console**を開く
   - Cloud Runと同じGoogleアカウントでログイン
   - [https://search.google.com/search-console](https://search.google.com/search-console)

2. **プロパティを追加**
   - 「プロパティを追加」をクリック
   - 「ドメイン」を選択
   - `beita.dev` を入力

3. **TXTレコードの取得**
   - 表示されたTXTレコード（`google-site-verification=...`）をコピー

4. **CloudflareでDNSレコードを追加**
   - Cloudflareダッシュボードの「DNS」タブを開く
   - 新しいレコードを追加：
     - **Type**: TXT
     - **Name**: `beita.dev`（Cloudflare UIでは `@` と表示されることもあります）
     - **Content**: `google-site-verification=xxxx...`（上記でコピーした値）
     - **Proxy**: どちらでもOK（TXTレコードなので）

5. **検証の完了**
   - 数分〜10分程度待機
   - Search Consoleで「確認」ボタンを押す
   - 検証が成功すると、親ドメインとその配下のすべてのサブドメインが有効になります

**注意**: すでにSearch Consoleで `beita.dev` をオーナー確認済みの場合は、この手順は不要です。

**重要**: この親ドメイン検証を先に完了させておくことで、後続のドメインマッピング作成時に「ドメイン所有権の検証」エラーが発生することを防げます。サブドメインを個別に検証するよりも効率的です。

### 1. 事前準備

```bash
# GCP認証とプロジェクト設定
make gcp-auth

# または手動で実行
gcloud auth login
gcloud config set project portfolio-472821
gcloud config set run/region asia-northeast1
```

**注意**: このガイドでは`gcloud beta run domain-mappings create`コマンドを使用します。公式の形式に従い、`--service`と`--domain`オプションのみを使用します。

### 2. ドメインマッピング作成

#### 開発環境の場合

```bash
# 開発環境のドメインマッピングを作成
make domain-mapping-create-dev

# または環境変数で指定
TF_ENV=dev make domain-mapping-create
```

#### 本番環境の場合

```bash
# 本番環境のドメインマッピングを作成
make domain-mapping-create-prod

# または環境変数で指定
TF_ENV=prod make domain-mapping-create
```

### 3. DNS設定情報の確認

ドメインマッピング作成後、Cloudflareで設定する必要があるDNSレコードを確認します：

```bash
# 開発環境のDNS設定情報を表示
make domain-mapping-info-dev

# 本番環境のDNS設定情報を表示
make domain-mapping-info-prod

# 環境別（TF_ENVで指定）
TF_ENV=dev make domain-mapping-info
```

### 4. CloudflareでのDNS設定

上記コマンドで表示されるDNSレコードをCloudflareのDNS設定に追加します：

1. **Cloudflareダッシュボード**にログイン
2. **DNS**タブを選択
3. 表示されたレコードを追加：
   - **Type**: A, AAAA, TXT（表示された通り）
   - **Name**: サブドメイン名
   - **Target**: 表示されたIPアドレスまたは値
   - **TTL**: Auto

**重要**: 最初は**ProxyをOFF（DNS only）**で設定してください。

### 5. 証明書の確認

DNS設定後、数分〜十数分でCloud Run側の証明書がACTIVEになります：

```bash
# ドメインマッピングの状態確認
make domain-mapping-status

# 全ドメインマッピングの一覧
make domain-mapping-list
```

### 6. Cloudflare Proxyの有効化

証明書がACTIVEになったら、CloudflareのProxyをONに切り替えます：

1. Cloudflareダッシュボードの**DNS**タブ
2. 各レコードの**Proxy**をONに切り替え
3. **SSL/TLS**タブで以下を設定：
   - **SSL/TLS encryption mode**: Full (strict)
   - **Always Use HTTPS**: ON
   - **HTTP/2**: ON
   - **HTTP/3**: ON

## 利用可能なMakeターゲット

| ターゲット | 説明 |
|-----------|------|
| `domain-mapping-create-dev` | 開発環境のドメインマッピング作成 |
| `domain-mapping-create-prod` | 本番環境のドメインマッピング作成 |
| `domain-mapping-create` | 環境別のドメインマッピング作成（TF_ENVで指定） |
| `domain-mapping-info-dev` | 開発環境のDNS設定情報表示 |
| `domain-mapping-info-prod` | 本番環境のDNS設定情報表示 |
| `domain-mapping-info` | 環境別のDNS設定情報表示 |
| `domain-mapping-status` | 全ドメインマッピングの状態確認 |
| `domain-mapping-list` | 全ドメインマッピングの一覧表示 |

## トラブルシューティング

### ドメインマッピングが見つからない場合

```bash
# まずCloud Runサービスがデプロイされているか確認
gcloud run services list --region=asia-northeast1

# サービスが存在しない場合は先にデプロイ
make deploy-gcp-dev-full  # 開発環境の場合
make deploy-gcp-prod-full # 本番環境の場合
```

### コマンド形式について

このガイドではGoogle Cloud公式の推奨形式に従い、以下のコマンド形式を使用しています：

```bash
gcloud beta run domain-mappings create --service SERVICE --domain DOMAIN
```

- `SERVICE`: Cloud Runサービス名
- `DOMAIN`: カスタムドメイン名

この形式の利点：
- Google Cloud公式ドキュメントと一致
- シンプルで分かりやすい
- エラーハンドリングが改善されている

### 証明書がACTIVEにならない場合

1. **DNS設定の確認**: Cloudflareで正しいレコードが設定されているか
2. **TTLの確認**: DNSキャッシュの影響で時間がかかる場合がある
3. **Proxy設定**: 最初はOFF（DNS only）で設定し、証明書がACTIVEになってからONに切り替え

### アクセスできない場合

1. **Cloudflare設定の確認**: SSL/TLSモードがFull (strict)になっているか
2. **ドメインマッピング状態**: `make domain-mapping-status`で状態を確認
3. **DNS伝播の確認**: `dig`コマンドでDNS設定を確認

```bash
# DNS設定の確認例
dig dev-app.trip.beita.dev
dig app.trip.beita.dev
```

## 参考情報

- [Cloud Run ドメインマッピング（公式）](https://cloud.google.com/run/docs/mapping-custom-domains)
- [gcloud run domain-mappings コマンド（公式）](https://cloud.google.com/sdk/gcloud/reference/beta/run/domain-mappings/create)
- [Cloudflare SSL/TLS設定](https://developers.cloudflare.com/ssl/ssl-tls/)
- [GCP Cloud Run ログ](https://cloud.google.com/run/docs/logging)
