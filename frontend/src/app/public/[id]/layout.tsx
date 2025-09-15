import { Metadata } from 'next';
import { buildApiUrl } from '@/lib/api';

type Props = {
  params: { id: string };
};

/**
 * 公開旅程ページのメタデータを生成
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = params;
  
  try {
    // バックエンドAPIから旅程データを取得
    const response = await fetch(buildApiUrl(`/public/${id}`), {
      cache: 'force-cache', // 静的生成用
    });
    
    if (!response.ok) {
      return {
        title: '旅程が見つかりません',
        description: '指定された旅程は存在しないか、公開されていません。',
      };
    }
    
    const data = await response.json();
    
    return {
      title: data.title || '旅のしおり',
      description: data.description || '共有された旅のしおりです',
      openGraph: {
        title: data.title || '旅のしおり',
        description: data.description || '共有された旅のしおりです',
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/public/${id}`,
        siteName: '旅のしおり',
        images: data.image ? [
          {
            url: data.image,
            width: 1200,
            height: 630,
            alt: data.title || '旅のしおり',
          }
        ] : [],
        type: 'article',
      },
      twitter: {
        card: 'summary_large_image',
        title: data.title || '旅のしおり',
        description: data.description || '共有された旅のしおりです',
        images: data.image ? [data.image] : [],
      },
    };
  } catch (error) {
    return {
      title: 'エラー',
      description: '旅程の取得中にエラーが発生しました。',
    };
  }
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
