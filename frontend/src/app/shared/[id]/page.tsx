'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Spinner } from '@/components/Primitives';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { buildApiUrl } from '@/lib/api';

/**
 * 共有旅程ページ（即リダイレクト/即保存）
 * 
 * 非ログイン時: 旅程データをLocalStorageに保存して/edit/ページにリダイレクト
 * ログイン時: 旅程を複製して自分の旅程として保存後、/edit/:idページにリダイレクト
 * 
 * @returns リダイレクト処理中のローディング画面
 */
export default function SharedPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const { isAuthenticated, isLoading: authLoading } = useAuthRedirect(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleRedirect = async () => {
      try {
        setLoading(true);
        setError(null);

        // 共有旅程データを取得
        const response = await fetch(buildApiUrl(`/shared/${id}`), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('共有された旅程が見つかりません');
          } else if (response.status === 410) {
            throw new Error('共有リンクの有効期限が切れています');
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        }

        const data = await response.json();

        if (isAuthenticated) {
          // ログイン時: 旅程を複製して自分の旅程として保存
          try {
            // 共有URLのIDをそのまま使用して複製（共有URLのID = 旅程ID）
            const copyResponse = await fetch(buildApiUrl(`/api/itineraries/copy/${id}`), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
            });

            if (!copyResponse.ok) {
              const errorData = await copyResponse.json();
              console.error('Copy failed:', errorData);
              
              // 自分の旅程の場合は直接編集ページにリダイレクト
              if (errorData.message === 'Cannot copy your own itinerary') {
                router.push(`/edit/${id}`);
                return;
              }
              
              throw new Error('旅程の複製に失敗しました');
            }

            const result = await copyResponse.json();
            // 複製された旅程の編集ページにリダイレクト
            router.push(`/edit/${result.id}`);
          } catch (err) {
            console.error('Failed to copy itinerary:', err);
            setError('旅程の複製に失敗しました');
          }
        } else {
          // 非ログイン時: LocalStorageに保存して/edit/ページにリダイレクト
          try {
            const itineraryData = {
              title: data.title,
              description: data.description || '',
              subtitle: data.subtitle || '',
              days: data.days || []
            };
            
            localStorage.setItem('itinerary', JSON.stringify(itineraryData));
            router.push('/edit');
          } catch (err) {
            console.error('Failed to save to local storage:', err);
            setError('ローカルストレージへの保存に失敗しました');
          }
        }
      } catch (err) {
        console.error('Failed to fetch shared itinerary:', err);
        setError(err instanceof Error ? err.message : '共有された旅程の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (id && !authLoading) {
      handleRedirect();
    }
  }, [id, isAuthenticated, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">
            {isAuthenticated ? '旅程を複製中...' : '編集ページに移動中...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">エラーが発生しました</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  return null;
}