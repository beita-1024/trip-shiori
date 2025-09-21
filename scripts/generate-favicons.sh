#!/bin/bash

# favicon生成スクリプト
# SVGから各種サイズのfaviconとPWAアイコンを生成

set -e

# 設定
SOURCE_SVG="frontend/public/logo-icon.svg"
OUTPUT_DIR="frontend/public"
TEMP_DIR="/tmp/favicon-gen"

# 必要なツールのチェック
check_dependencies() {
    echo "依存関係をチェック中..."
    
    if ! command -v npx &> /dev/null; then
        echo "❌ npx が見つかりません。Node.jsをインストールしてください。"
        exit 1
    fi
    
    # sharp-cliをインストール（必要に応じて）
    if ! npx sharp-cli --version &> /dev/null; then
        echo "📦 sharp-cliをインストール中..."
        npm install -g sharp-cli
    fi
    
    # to-icoは使用しないため、チェックをスキップ
    
    echo "✅ 依存関係のチェック完了"
}

# ソースSVGの存在確認
check_source() {
    if [ ! -f "$SOURCE_SVG" ]; then
        echo "❌ ソースSVGファイルが見つかりません: $SOURCE_SVG"
        exit 1
    fi
    echo "✅ ソースSVGファイルを確認: $SOURCE_SVG"
}

# 一時ディレクトリの準備
prepare_temp_dir() {
    rm -rf "$TEMP_DIR"
    mkdir -p "$TEMP_DIR"
    echo "✅ 一時ディレクトリを準備: $TEMP_DIR"
}

# 各種サイズのアイコンを生成
generate_icons() {
    echo "🎨 アイコンを生成中..."
    
    # PNG形式で各サイズを生成（sharp-cliの正しい使い方）
    npx sharp-cli -i "$SOURCE_SVG" -o "$TEMP_DIR/favicon-16.png" resize 16 16
    npx sharp-cli -i "$SOURCE_SVG" -o "$TEMP_DIR/favicon-32.png" resize 32 32
    npx sharp-cli -i "$SOURCE_SVG" -o "$TEMP_DIR/apple-touch-icon.png" resize 180 180
    npx sharp-cli -i "$SOURCE_SVG" -o "$TEMP_DIR/icon-192.png" resize 192 192
    npx sharp-cli -i "$SOURCE_SVG" -o "$TEMP_DIR/icon-512.png" resize 512 512
    
    # ICO形式のfaviconを生成（32x32をコピーしてfavicon.icoとして使用）
    cp "$TEMP_DIR/favicon-32.png" "$TEMP_DIR/favicon.ico"
    
    # Safari用のmask-icon（単色SVG）を生成
    cp "$SOURCE_SVG" "$TEMP_DIR/mask-icon.svg"
    
    echo "✅ アイコンの生成完了"
}

# ファイルを出力ディレクトリにコピー
copy_files() {
    echo "📁 ファイルをコピー中..."
    
    # 既存のfaviconファイルをバックアップ
    if [ -f "$OUTPUT_DIR/favicon.ico" ]; then
        mv "$OUTPUT_DIR/favicon.ico" "$OUTPUT_DIR/favicon.ico.backup"
    fi
    
    # 新しいファイルをコピー
    cp "$TEMP_DIR/favicon.ico" "$OUTPUT_DIR/"
    cp "$TEMP_DIR/favicon-16.png" "$OUTPUT_DIR/"
    cp "$TEMP_DIR/favicon-32.png" "$OUTPUT_DIR/"
    cp "$TEMP_DIR/apple-touch-icon.png" "$OUTPUT_DIR/"
    cp "$TEMP_DIR/icon-192.png" "$OUTPUT_DIR/"
    cp "$TEMP_DIR/icon-512.png" "$OUTPUT_DIR/"
    cp "$TEMP_DIR/mask-icon.svg" "$OUTPUT_DIR/"
    
    # 元のSVGをfavicon.svgとしてもコピー
    cp "$SOURCE_SVG" "$OUTPUT_DIR/favicon.svg"
    
    echo "✅ ファイルのコピー完了"
}

# 生成されたファイルの確認
verify_files() {
    echo "🔍 生成されたファイルを確認中..."
    
    local files=(
        "favicon.svg"
        "favicon.ico"
        "favicon-16.png"
        "favicon-32.png"
        "apple-touch-icon.png"
        "icon-192.png"
        "icon-512.png"
        "mask-icon.svg"
    )
    
    for file in "${files[@]}"; do
        if [ -f "$OUTPUT_DIR/$file" ]; then
            local size=$(ls -lh "$OUTPUT_DIR/$file" | awk '{print $5}')
            echo "  ✅ $file ($size)"
        else
            echo "  ❌ $file が見つかりません"
        fi
    done
}

# 一時ディレクトリのクリーンアップ
cleanup() {
    rm -rf "$TEMP_DIR"
    echo "🧹 一時ディレクトリをクリーンアップ"
}

# メイン処理
main() {
    echo "🚀 favicon生成を開始..."
    echo "ソース: $SOURCE_SVG"
    echo "出力先: $OUTPUT_DIR"
    echo ""
    
    check_dependencies
    check_source
    prepare_temp_dir
    generate_icons
    copy_files
    verify_files
    cleanup
    
    echo ""
    echo "🎉 favicon生成が完了しました！"
    echo ""
    echo "生成されたファイル:"
    ls -la "$OUTPUT_DIR"/favicon* "$OUTPUT_DIR"/apple-touch-icon.png "$OUTPUT_DIR"/icon-*.png "$OUTPUT_DIR"/mask-icon.svg 2>/dev/null || true
}

# スクリプト実行
main "$@"
