#!/bin/bash

# パスワード生成
echo "データベースパスワード:"
openssl rand -base64 32

echo ""
echo " JWTシークレット:"
openssl rand -hex 32
