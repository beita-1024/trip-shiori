'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Spinner } from '@/components/Primitives';

interface SharedItinerary {
  id: string;
  title: string;
  data: any;
  createdAt: string;
  updatedAt: string;
  share: {
    id: string;
    scope: string;
    permission: string;
    hasPassword: boolean;
    expiresAt: string | null;
    allowedEmails: Array<{ email: string; name: string | null }>;
  };
}

interface SharedPageProps {
  params: Promise<{ id: string }>;
}

/**
 * 共有URL経由で旅程を表示するページ
 * 
 * @param params - ルートパラメータ（旅程ID）
 * @returns 共有された旅程の表示ページ
 */
export default function SharedPage({ params }: SharedPageProps) {
  const router = useRouter();
  const [itinerary, setItinerary] = React.useState<SharedItinerary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const { id } = React.use(params);

  React.useEffect(() => {
    const fetchSharedItinerary = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/shared/${id}`, {
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
        setItinerary(data);
      } catch (err) {
        console.error('Failed to fetch shared itinerary:', err);
        setError(err instanceof Error ? err.message : '共有された旅程の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchSharedItinerary();
    }
  }, [id]);

  const handleBackToHome = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">共有された旅程を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">アクセスできません</h1>
            <p className="text-gray-600">{error}</p>
          </div>
          <Button onClick={handleBackToHome} variant="primary">
            ホームに戻る
          </Button>
        </Card>
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">旅程が見つかりません</h1>
            <p className="text-gray-600">共有された旅程のデータを取得できませんでした。</p>
          </div>
          <Button onClick={handleBackToHome} variant="primary">
            ホームに戻る
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{itinerary.title}</h1>
              <p className="text-sm text-gray-500 mt-1">
                共有された旅程 • {new Date(itinerary.updatedAt).toLocaleDateString('ja-JP')}
              </p>
            </div>
            <Button onClick={handleBackToHome} variant="ghost">
              ホームに戻る
            </Button>
          </div>
        </div>

        {/* 旅程情報 */}
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">旅程情報</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">作成日:</span>
                <span className="ml-2 text-gray-600">
                  {new Date(itinerary.createdAt).toLocaleDateString('ja-JP')}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">更新日:</span>
                <span className="ml-2 text-gray-600">
                  {new Date(itinerary.updatedAt).toLocaleDateString('ja-JP')}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">共有権限:</span>
                <span className="ml-2 text-gray-600">
                  {itinerary.share.permission === 'READ_ONLY' ? '閲覧のみ' : '編集可能'}
                </span>
              </div>
              {itinerary.share.expiresAt && (
                <div>
                  <span className="font-medium text-gray-700">有効期限:</span>
                  <span className="ml-2 text-gray-600">
                    {new Date(itinerary.share.expiresAt).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 旅程データの表示 */}
          <div className="mt-6">
            <h3 className="text-md font-semibold text-gray-900 mb-3">旅程詳細</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(itinerary.data, null, 2)}
              </pre>
            </div>
          </div>
        </Card>

        {/* 注意事項 */}
        <Card className="mt-6 p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">共有された旅程について</h4>
              <p className="text-sm text-blue-700 mt-1">
                この旅程は共有リンク経由で表示されています。編集権限がない場合は、旅程の内容を変更することはできません。
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
