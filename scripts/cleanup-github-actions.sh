#!/bin/bash

# GitHub Actionsの履歴を削除するスクリプト
# 2日前までのワークフロー実行履歴を削除します

set -euo pipefail

# 色付きログ関数
log_info() {
    echo -e "\033[32m[INFO]\033[0m $1"
}

log_warn() {
    echo -e "\033[33m[WARN]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

# 設定
REPO_OWNER="beita-1024"
REPO_NAME="trip-shiori"
DAYS_AGO=${DAYS_AGO:-2}
DRY_RUN=${DRY_RUN:-false}

# 日付計算（全て削除の場合は日付制限なし）
if [ "$DAYS_AGO" = "all" ]; then
    CUTOFF_DATE="1970-01-01T00:00:00Z"
    DATE_DESCRIPTION="全ての"
else
    CUTOFF_DATE=$(date -d "${DAYS_AGO} days ago" -u +"%Y-%m-%dT%H:%M:%SZ")
    DATE_DESCRIPTION="${DAYS_AGO}日前（${CUTOFF_DATE}）より前の"
fi

log_info "GitHub Actions履歴削除スクリプトを開始します"
log_info "リポジトリ: ${REPO_OWNER}/${REPO_NAME}"
log_info "削除対象: ${DATE_DESCRIPTION}ワークフロー実行"
log_info "ドライランモード: ${DRY_RUN}"

# GitHub CLIの存在確認
if ! command -v gh &> /dev/null; then
    log_error "GitHub CLI (gh) がインストールされていません"
    log_error "インストール方法: https://cli.github.com/"
    exit 1
fi

# GitHub認証確認
if ! gh auth status &> /dev/null; then
    log_error "GitHub CLIが認証されていません"
    log_error "認証方法: gh auth login"
    exit 1
fi

# リポジトリの存在確認
if ! gh repo view "${REPO_OWNER}/${REPO_NAME}" &> /dev/null; then
    log_error "リポジトリ ${REPO_OWNER}/${REPO_NAME} が見つかりません"
    log_error "アクセス権限を確認してください"
    exit 1
fi

log_info "認証とリポジトリアクセスを確認しました"

# ワークフロー実行履歴を取得
log_info "ワークフロー実行履歴を取得中..."

# 全ワークフロー実行を取得（完了したもののみ、ページネーション対応）
if [ "$DAYS_AGO" = "all" ]; then
    # 全ての完了したワークフロー実行を取得
    WORKFLOW_RUNS=$(gh api --paginate \
        -H "Accept: application/vnd.github+json" \
        "/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs?per_page=100" \
        --jq '.workflow_runs[] | select(.status == "completed") | {id: .id, name: .name, created_at: .created_at, conclusion: .conclusion}')
else
    # 指定日数より前のワークフロー実行を取得
    WORKFLOW_RUNS=$(gh api --paginate \
        -H "Accept: application/vnd.github+json" \
        "/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs?per_page=100" \
        --jq '.workflow_runs[] | select(.status == "completed") | select(.created_at < "'"${CUTOFF_DATE}"'") | {id: .id, name: .name, created_at: .created_at, conclusion: .conclusion}')
fi

if [ -z "$WORKFLOW_RUNS" ]; then
    log_info "削除対象のワークフロー実行が見つかりませんでした"
    exit 0
fi

# 削除対象のワークフロー実行数をカウント
DELETE_COUNT=$(echo "$WORKFLOW_RUNS" | jq -s 'length')

log_info "削除対象: ${DELETE_COUNT} 件のワークフロー実行"

# ドライランモードの場合は詳細表示のみ
if [ "$DRY_RUN" = "true" ]; then
    log_warn "ドライランモード: 実際の削除は実行されません"
    echo "$WORKFLOW_RUNS" | jq -r '"- ID: \(.id), Name: \(.name), Created: \(.created_at), Conclusion: \(.conclusion)"'
    log_info "ドライランモード完了"
    exit 0
fi

# 確認プロンプト
if [ "$DAYS_AGO" = "all" ]; then
    log_warn "⚠️  警告: この操作は ${DELETE_COUNT} 件のワークフロー実行を削除します（全ての履歴）"
    log_warn "⚠️  削除されたワークフロー実行は復元できません"
    log_warn "⚠️  全てのGitHub Actions履歴が失われます"
else
    log_warn "⚠️  警告: この操作は ${DELETE_COUNT} 件のワークフロー実行を削除します"
    log_warn "⚠️  削除されたワークフロー実行は復元できません"
fi
echo ""
echo "続行するには 'yes' と入力してください:"
read -r confirm

if [ "$confirm" != "yes" ]; then
    log_info "操作がキャンセルされました"
    exit 0
fi

# ワークフロー実行を削除
log_info "ワークフロー実行を削除中..."

DELETED_COUNT=0
FAILED_COUNT=0

echo "$WORKFLOW_RUNS" | jq -r '.id' | while read -r run_id; do
    if [ -n "$run_id" ]; then
        log_info "削除中: ワークフロー実行 ID ${run_id}"
        
        if gh api \
            -X DELETE \
            "/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs/${run_id}" \
            --silent; then
            log_info "✅ 削除完了: ID ${run_id}"
            DELETED_COUNT=$((DELETED_COUNT + 1))
        else
            log_error "❌ 削除失敗: ID ${run_id}"
            FAILED_COUNT=$((FAILED_COUNT + 1))
        fi
    fi
done

# 結果表示
log_info "削除処理が完了しました"
log_info "削除成功: ${DELETED_COUNT} 件"
if [ $FAILED_COUNT -gt 0 ]; then
    log_warn "削除失敗: ${FAILED_COUNT} 件"
fi

log_info "GitHub Actions履歴削除スクリプトが完了しました"
