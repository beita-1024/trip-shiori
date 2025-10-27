import React, { useState, useEffect } from 'react';
import { Button, Spinner } from '@/components/Primitives';
import { ItineraryListItem } from '@/types';
import { buildApiUrl } from '@/lib/api';

interface ShareSettingsDialogProps {
  itinerary: ItineraryListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

interface ShareSettings {
  scope: 'PRIVATE' | 'PUBLIC_LINK' | 'PUBLIC';
  permission: 'READ_ONLY' | 'EDIT';
  password?: string;
  expiresAt?: string;
}

/**
 * 共有設定ダイアログコンポーネント
 * 
 * 旅程の共有設定を変更するためのダイアログです。
 * 公開種類、有効期限、パスワードの設定が可能です。
 */
export const ShareSettingsDialog: React.FC<ShareSettingsDialogProps> = ({
  itinerary,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [settings, setSettings] = useState<ShareSettings>({
    scope: 'PRIVATE',
    permission: 'READ_ONLY',
    password: '',
    expiresAt: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditingExpiresAt, setIsEditingExpiresAt] = useState(false);
  const [expiresAtError, setExpiresAtError] = useState<string | null>(null);

  // 旅程が変更されたときに設定を初期化
  useEffect(() => {
    if (itinerary) {
      setSettings({
        scope: itinerary.share?.scope || 'PRIVATE',
        permission: itinerary.share?.permission || 'READ_ONLY',
        password: '',
        expiresAt: itinerary.share?.expiresAt || '',
      });
      setError(null);
    }
  }, [itinerary]);

  const handleScopeChange = (scope: 'PRIVATE' | 'PUBLIC_LINK' | 'PUBLIC') => {
    setSettings(prev => ({
      ...prev,
      scope,
      // TODO: パスワード機能追加時に有効化
      // password: scope !== 'PUBLIC_LINK' ? '' : prev.password,
    }));
  };

  // TODO: 権限変更機能追加時に有効化
  // const handlePermissionChange = (permission: 'READ_ONLY' | 'EDIT') => {
  //   setSettings(prev => ({ ...prev, permission }));
  // };

  // TODO: パスワード機能追加時に有効化
  // const handlePasswordChange = (password: string) => {
  //   setSettings(prev => ({ ...prev, password }));
  // };

  const handleExpiresAtChange = (expiresAt: string) => {
    setSettings(prev => ({ ...prev, expiresAt }));
    
    // リアルタイムバリデーション
    if (expiresAt) {
      const validationError = validateExpiresAt(expiresAt);
      setExpiresAtError(validationError);
    } else {
      setExpiresAtError(null);
    }
  };

  /**
   * 有効期限のバリデーション関数
   * 
   * @param dateTimeString - ISO形式の日時文字列
   * @returns エラーメッセージまたはnull
   */
  const validateExpiresAt = (dateTimeString: string): string | null => {
    if (!dateTimeString) return null;
    const expiresDate = new Date(dateTimeString);
    const now = new Date();
    if (expiresDate <= now) {
      return '有効期限は現在時刻より後の日時を設定してください';
    }
    return null;
  };
  const formatDateTimeWithWeekday = (dateTimeString: string): string => {
    if (!dateTimeString) return '';
    
    const date = new Date(dateTimeString);
    const dateStr = date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const weekday = new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(date);
    const timeStr = date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    
    return `${dateStr} (${weekday}) ${timeStr}`;
  };


  const handleSave = async () => {
    if (!itinerary) return;

    // 有効期限の事前バリデーション
    if (settings.expiresAt) {
      const validationError = validateExpiresAt(settings.expiresAt);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);

      const payload: Record<string, unknown> = {
        scope: settings.scope,
        permission: settings.permission,
      };

      // TODO: パスワード機能追加時に有効化
      // if (settings.password && settings.scope === 'PUBLIC_LINK') {
      //   payload.password = settings.password;
      // }

      // 有効期限が設定されている場合のみ追加
      if (settings.expiresAt) {
        payload.expiresAt = new Date(settings.expiresAt).toISOString();
      }

      // 共有設定が存在するかどうかでHTTPメソッドを決定
      const method = itinerary.share ? 'PUT' : 'POST';

      const response = await fetch(buildApiUrl(`/api/itineraries/${itinerary.id}/share`), {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '共有設定の保存に失敗しました');
      }

      onUpdate();
      onClose();
    } catch (err) {
      console.error('Failed to save share settings:', err);
      setError(err instanceof Error ? err.message : '共有設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itinerary || !itinerary.share) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(buildApiUrl(`/api/itineraries/${itinerary.id}/share`), {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('共有設定の削除に失敗しました');
      }

      onUpdate();
      onClose();
    } catch (err) {
      console.error('Failed to delete share settings:', err);
      setError(err instanceof Error ? err.message : '共有設定の削除に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !itinerary) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-surface border border-ui rounded-lg p-6 w-[min(480px,90vw)] elevation-4 relative">
        <button
          type="button"
          className="action-icon-btn absolute right-3 top-3 z-10"
          aria-label="閉じる"
          onClick={onClose}
          disabled={saving}
        >
          <i className="mdi mdi-close" aria-hidden />
        </button>
        <div className="text-lg font-medium mb-6 pr-8">
          共有設定
        </div>

        <div className="space-y-6">
          {/* 公開種類設定 */}
          <div>
            <label className="block text-sm font-medium text-body mb-3">
              公開種類設定
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="scope"
                  value="PRIVATE"
                  checked={settings.scope === 'PRIVATE'}
                  onChange={() => handleScopeChange('PRIVATE')}
                  className="mr-3"
                  disabled={saving}
                />
                <span className="text-sm text-body">非公開</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="scope"
                  value="PUBLIC_LINK"
                  checked={settings.scope === 'PUBLIC_LINK'}
                  onChange={() => handleScopeChange('PUBLIC_LINK')}
                  className="mr-3"
                  disabled={saving}
                />
                <span className="text-sm text-body">リンク共有</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="scope"
                  value="PUBLIC"
                  checked={settings.scope === 'PUBLIC'}
                  onChange={() => handleScopeChange('PUBLIC')}
                  className="mr-3"
                  disabled={saving}
                />
                <span className="text-sm text-body">全体公開</span>
              </label>
            </div>
          </div>

          {/* 有効期限（任意設定） */}
          <div>
            <label className="block text-sm font-medium text-body mb-2">
              有効期限（任意）
            </label>
            <input
              type={isEditingExpiresAt ? "datetime-local" : "text"}
              value={isEditingExpiresAt ? settings.expiresAt : formatDateTimeWithWeekday(settings.expiresAt || '')}
              onChange={(e) => handleExpiresAtChange(e.target.value)}
              onFocus={() => setIsEditingExpiresAt(true)}
              onBlur={() => setIsEditingExpiresAt(false)}
              readOnly={!isEditingExpiresAt}
              min={new Date().toISOString().slice(0, 16)}
              className={`w-full rounded-md border border-input p-3 bg-input text-body ${
                settings.scope === 'PRIVATE' ? 'opacity-50' : ''
              } ${expiresAtError ? 'border-red-500' : ''}`}
              disabled={saving || settings.scope === 'PRIVATE'}
            />
            <p className="text-xs text-body-secondary mt-1">
              設定しない場合は無期限で共有されます
            </p>
            {expiresAtError && (
              <p className="text-xs text-red-500 mt-1">
                {expiresAtError}
              </p>
            )}
          </div>

          {/* TODO: パスワード設定機能（将来的に追加予定） */}
          {/* 
          <div>
            <label className="block text-sm font-medium text-body mb-2">
              パスワード（任意）
            </label>
            <input
              type="password"
              value={settings.password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="パスワードを入力（8文字以上）"
              className={`w-full rounded-md border border-input p-3 bg-input text-body placeholder:text-input-placeholder ${
                settings.scope !== 'PUBLIC_LINK' ? 'opacity-50' : ''
              }`}
              disabled={saving || settings.scope !== 'PUBLIC_LINK'}
            />
          </div>
          */}

          {/* エラー表示 */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* ボタン */}
          <div className="flex gap-3 justify-end">
            {itinerary.share && (
              <Button
                onClick={handleDelete}
                kind="ghost"
                disabled={saving}
                className="text-red-600 hover:text-red-700"
              >
                共有設定を削除
              </Button>
            )}
            <Button
              onClick={onClose}
              kind="ghost"
              disabled={saving}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSave}
              kind="primary"
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving && <Spinner size="sm" />}
              保存
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
