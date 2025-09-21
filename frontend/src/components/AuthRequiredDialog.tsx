/**
 * 認証必須機能の登録促進ダイアログ
 * 
 * 未認証ユーザーが制限機能を使用しようとした際に表示されるダイアログです。
 * 登録のメリットを説明し、登録ページへの導線を提供します。
 * 
 * @param props.isOpen - ダイアログの表示状態
 * @param props.onClose - ダイアログを閉じるハンドラー
 * @param props.onRegister - 登録ページへの遷移ハンドラー
 * @param props.featureName - 制限されている機能名
 * @returns レンダリングされたAuthRequiredDialogコンポーネント
 * 
 * @example
 * <AuthRequiredDialog
 *   isOpen={showAuthDialog}
 *   onClose={() => setShowAuthDialog(false)}
 *   onRegister={() => router.push('/register')}
 *   featureName="AI補完機能"
 * />
 */
"use client";

import React from "react";
import { Button } from "@/components/Primitives";

interface AuthRequiredDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: () => void;
  featureName: string;
}

export default function AuthRequiredDialog({
  isOpen,
  onClose,
  onRegister,
  featureName,
}: AuthRequiredDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface border border-ui rounded-lg p-6 max-w-md mx-4 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <i className="mdi mdi-lock text-primary text-xl" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-body">登録が必要です</h3>
            <p className="text-sm text-muted">{featureName}をご利用いただくには登録が必要です</p>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="font-medium text-body mb-2">登録すると以下の機能がご利用いただけます：</h4>
          <ul className="text-sm text-muted space-y-1">
            <li className="flex items-center gap-2">
              <i className="mdi mdi-check text-green-500" />
              AI補完機能で旅程を自動生成
            </li>
            <li className="flex items-center gap-2">
              <i className="mdi mdi-check text-green-500" />
              複数の旅程をクラウドに保存
            </li>
            <li className="flex items-center gap-2">
              <i className="mdi mdi-check text-green-500" />
              旅程の共有URL生成
            </li>
          </ul>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            kind="ghost"
            onClick={onClose}
            className="text-muted hover:text-body"
          >
            後で
          </Button>
          <Button
            kind="primary"
            onClick={onRegister}
            className="bg-primary hover:bg-primary/90"
          >
            無料で登録
          </Button>
        </div>
      </div>
    </div>
  );
}
