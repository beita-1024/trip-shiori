import { Metadata } from 'next';
import { buildApiUrl } from '@/lib/api';

type Props = {
  params: { id: string };
};

/**
 * 共有旅程ページのメタデータを生成
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = params;
  
  try {
    // バックエンドAPIから旅程データを取得
    const response = await fetch(buildApiUrl(`/shared/${id}`), {
      cache: 'force-cache', // 静的生成用
    });
    
    if (!response.ok) {
      return {
        title: '旅程が見つかりません',
        description: '指定された旅程は存在しないか、共有されていません。',
      };
    }
    
    const data = await response.json();
    
    return {
      title: data.title || '旅のしおり',
      description: data.description || '共有された旅のしおりです',
      openGraph: {
        title: data.title || '旅のしおり',
        description: data.description || '共有された旅のしおりです',
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/shared/${id}`,
        siteName: '旅のしおり',
        type: 'article',
      },
      robots: { index: false, follow: false }, // 共有リンクは検索エンジンにインデックスしない
    };
  } catch {
    return {
      title: 'エラー',
      description: '旅程の取得中にエラーが発生しました。',
    };
  }
}

export default function SharedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
