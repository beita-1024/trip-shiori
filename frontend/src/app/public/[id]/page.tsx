'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import Head from 'next/head';
import { Spinner } from '@/components/Primitives';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { buildApiUrl } from '@/lib/api';

/**
 * 公開旅程ページ（即リダイレクト/即保存）
 * 
 * 非ログイン時: 旅程データをLocalStorageに保存して/edit/ページにリダイレクト
 * ログイン時: 旅程を複製して自分の旅程として保存後、/edit/:idページにリダイレクト
 * 
 * @returns リダイレクト処理中のローディング画面
 */
export default function PublicPage() {
  const PUBLIC_SHARING_ENABLED = (process.env.NEXT_PUBLIC_PUBLIC_SHARING_ENABLED || 'false').toLowerCase() === 'true';
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const { isAuthenticated, isLoading: authLoading } = useAuthRedirect(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [ogpData, setOgpData] = React.useState<{
    title: string;
    description: string;
    url: string;
    type: string;
    site_name: string;
    image?: string;
  } | null>(null);

  React.useEffect(() => {
    if (!PUBLIC_SHARING_ENABLED) {
      setLoading(false);
      setError('公開共有は現在ご利用いただけません（要件調整中のため一時停止しています）');
      return;
    }
    const handleRedirect = async () => {
      try {
        setLoading(true);
        setError(null);

        // 公開旅程データを取得
        const response = await fetch(buildApiUrl(`/public/${id}`), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('公開された旅程が見つかりません');
          } else if (response.status === 403) {
            throw new Error('この旅程は公開されていません');
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        }

        const data = await response.json();
        
        // OGPデータを設定
        if (data._publicInfo?.ogp) {
          setOgpData(data._publicInfo.ogp);
        }

        if (isAuthenticated) {
          // ログイン時: 旅程を複製して自分の旅程として保存
          try {
            // まず、自分の旅程かどうかを確認
            const ownershipResponse = await fetch(buildApiUrl(`/api/itineraries/${id}/ownership`), {
              credentials: 'include',
            });
        
            if (ownershipResponse.ok) {
              const ownershipData = await ownershipResponse.json();
              
              // 自分の旅程の場合は直接編集ページにリダイレクト
              if (ownershipData.isOwner) {
                console.log('This is your own itinerary, redirecting to edit page');
                router.push(`/edit/${id}`);
                return;
              }
            } else {
              console.warn('Failed to check ownership, proceeding with copy attempt');
            }
            
            // 他人の旅程の場合のみ複製を実行
            console.log('This is not your itinerary, attempting to copy');
            const copyResponse = await fetch(buildApiUrl(`/api/itineraries/copy/${id}`), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
            });
        
            if (!copyResponse.ok) {
              // 複製エラーの場合のみエラーハンドリング
              let errorData;
              try {
                const responseText = await copyResponse.text();
                if (responseText.trim()) {
                  errorData = JSON.parse(responseText);
                } else {
                  errorData = { message: `HTTP ${copyResponse.status}: ${copyResponse.statusText}` };
                }
              } catch (parseError) {
                console.error('Failed to parse error response:', parseError);
                errorData = { message: `HTTP ${copyResponse.status}: ${copyResponse.statusText}` };
              }
              
              console.error('Copy failed:', errorData);
              throw new Error(`旅程の複製に失敗しました: ${errorData.message || 'Unknown error'}`);
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
        console.error('Failed to fetch public itinerary:', err);
        setError(err instanceof Error ? err.message : '公開された旅程の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (id && !authLoading && PUBLIC_SHARING_ENABLED) {
      handleRedirect();
    }
  }, [id, isAuthenticated, authLoading, router, PUBLIC_SHARING_ENABLED]);

  if (authLoading) {
    return (
      <>
        {ogpData && (
          <Head>
            <title>{ogpData.title}</title>
            <meta name="description" content={ogpData.description} />
            <meta property="og:title" content={ogpData.title} />
            <meta property="og:description" content={ogpData.description} />
            <meta property="og:url" content={ogpData.url} />
            <meta property="og:type" content={ogpData.type} />
            <meta property="og:site_name" content={ogpData.site_name} />
            {ogpData.image && <meta property="og:image" content={ogpData.image} />}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={ogpData.title} />
            <meta name="twitter:description" content={ogpData.description} />
            {ogpData.image && <meta name="twitter:image" content={ogpData.image} />}
          </Head>
        )}
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600">認証状態を確認中...</p>
          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        {ogpData && (
          <Head>
            <title>{ogpData.title}</title>
            <meta name="description" content={ogpData.description} />
            <meta property="og:title" content={ogpData.title} />
            <meta property="og:description" content={ogpData.description} />
            <meta property="og:url" content={ogpData.url} />
            <meta property="og:type" content={ogpData.type} />
            <meta property="og:site_name" content={ogpData.site_name} />
            {ogpData.image && <meta property="og:image" content={ogpData.image} />}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={ogpData.title} />
            <meta name="twitter:description" content={ogpData.description} />
            {ogpData.image && <meta name="twitter:image" content={ogpData.image} />}
          </Head>
        )}
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600">
              {isAuthenticated ? '旅程を複製中...' : '編集ページに移動中...'}
            </p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {ogpData && (
          <Head>
            <title>{ogpData.title}</title>
            <meta name="description" content={ogpData.description} />
            <meta property="og:title" content={ogpData.title} />
            <meta property="og:description" content={ogpData.description} />
            <meta property="og:url" content={ogpData.url} />
            <meta property="og:type" content={ogpData.type} />
            <meta property="og:site_name" content={ogpData.site_name} />
            {ogpData.image && <meta property="og:image" content={ogpData.image} />}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={ogpData.title} />
            <meta name="twitter:description" content={ogpData.description} />
            {ogpData.image && <meta name="twitter:image" content={ogpData.image} />}
          </Head>
        )}
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
      </>
    );
  }

  return (
    <>
      {ogpData && (
        <Head>
          <title>{ogpData.title}</title>
          <meta name="description" content={ogpData.description} />
          <meta property="og:title" content={ogpData.title} />
          <meta property="og:description" content={ogpData.description} />
          <meta property="og:url" content={ogpData.url} />
          <meta property="og:type" content={ogpData.type} />
          <meta property="og:site_name" content={ogpData.site_name} />
          {ogpData.image && <meta property="og:image" content={ogpData.image} />}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={ogpData.title} />
          <meta name="twitter:description" content={ogpData.description} />
          {ogpData.image && <meta name="twitter:image" content={ogpData.image} />}
        </Head>
      )}
    </>
  );
}