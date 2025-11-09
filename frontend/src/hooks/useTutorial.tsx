/**
 * チュートリアル管理用のカスタムフック
 * 
 * Driver.jsを使用したチュートリアルシステムを管理します。
 * 初回実行の制御、再受講機能、localStorageでの実行履歴管理を行います。
 * 途中離脱機能と確認ダイアログも含みます。
 * 
 * @returns チュートリアル制御関数と状態
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { startTutorial, exitTutorial, isFirstTime, TutorialButton } = useTutorial();
 *   
 *   useEffect(() => {
 *     if (isFirstTime) {
 *       startTutorial();
 *     }
 *   }, [isFirstTime, startTutorial]);
 *   
 *   return (
 *     <div>
 *       <TutorialButton />
 *       <button onClick={exitTutorial}>チュートリアルを終了</button>
 *     </div>
 *   );
 * }
 * ```
 */
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { Button } from '@/components/Primitives';

interface TutorialStep {
  element: string;
  popover: {
    title: string;
    description: string;
    side?: 'left' | 'right' | 'top' | 'bottom';
    align?: 'start' | 'center' | 'end';
  };
}

const TUTORIAL_VERSION = 'v2';
const STORAGE_KEY = `tour_${TUTORIAL_VERSION}_done`;

// チュートリアルのステップ定義
const TUTORIAL_STEPS: TutorialStep[] = [
  // {
  //   element: '[data-tour="welcome"]',
  //   popover: {
  //     title: 'ようこそ！',
  //     description: 'AI旅のしおりアプリへようこそ！このチュートリアルで基本的な使い方をご案内します。',
  //     side: 'bottom',
  //     align: 'center'
  //   }
  // },
  {
    element: '[data-tour="basic-info-card"]',
    popover: {
      title: '基本情報編集',
      description: 'ここで旅程のタイトル、サブタイトル、概要を編集できます。クリックして編集してみてください。',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="day-editor"]',
    popover: {
      title: '日程一覧',
      description: '各日の日程一覧を表示します。日付を設定し、イベントを追加・編集できます。',
      side: 'top',
      align: 'start'
    }
  },
  // {
  //   element: '[data-tour="event-add"]',
  //   popover: {
  //     title: '➕ イベントの追加',
  //     description: '「イベントを追加」ボタンで新しいイベントを追加できます。ドラッグ&ドロップで順序も変更可能です。',
  //     side: 'top',
  //     align: 'center'
  //   }
  // },
  {
    element: '[data-tour="ai-feature"]',
    popover: {
      title: 'AI補完機能',
      description: 'AI補完機能でイベントを自動生成できます。登録すると全機能がご利用いただけます！',
      side: 'left',
      align: 'center'
    }
  },
  {
    element: '[data-tour="print-feature"]',
    popover: {
      title: '印刷機能',
      description: '印刷ボタンで旅程を印刷できます。三つ折り形式のレイアウトで印刷可能です。',
      side: 'top',
      align: 'center'
    }
  },
  {
    element: '[data-tour="ai-edit-feature"]',
    popover: {
      title: 'AI編集機能',
      description: 'AI対話形式で旅程を編集できます。「2日目に観光地を追加して」など自然な言葉で指示できます。登録するとご利用いただけます！',
      side: 'top',
      align: 'center'
    }
  },
  {
    element: '[data-tour="demo-label"]',
    popover: {
      title: 'デモ版について',
      description: '現在はデモ版です。右上の「登録」ボタンから無料登録すると、AI機能やクラウド保存がご利用いただけます。',
      side: 'left',
      align: 'end'
    }
  },
  {
    element: '[data-tour="reset-button"]',
    popover: {
      title: 'デフォルトに戻す',
      description: '「デフォルトに戻す」ボタンで空の旅程にリセットできます。サンプルデータから始めたい場合は、このボタンでクリアしてから新しく作成できます。',
      side: 'top',
      align: 'center'
    }
  }
];

export function useTutorial() {
  const [isFirstTime, setIsFirstTime] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  /**
   * チュートリアルの実行履歴をチェック
   */
  const checkTutorialHistory = useCallback(() => {
    try {
      const hasRunBefore = localStorage.getItem(STORAGE_KEY) === 'true';
      setIsFirstTime(!hasRunBefore);
    } catch (error) {
      console.warn('localStorage access failed:', error);
      setIsFirstTime(true); // エラー時は初回として扱う
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Driver.jsの初期化
   */
  const initializeDriver = useCallback(() => {
    if (driverRef.current) return driverRef.current;

    driverRef.current = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      nextBtnText: '次へ',
      prevBtnText: '戻る',
      doneBtnText: '完了',
      progressText: '{{current}} / {{total}}',
      allowClose: true, // オーバーレイクリックで終了可能
      steps: TUTORIAL_STEPS,
      onDestroyed: () => {
        // チュートリアル完了時にlocalStorageに記録
        try {
          localStorage.setItem(STORAGE_KEY, 'true');
          setIsFirstTime(false);
        } catch (error) {
          console.warn('Failed to save tutorial completion:', error);
        }
      },
      onHighlightStarted: (element, step) => {
        // デバッグ用：ステップ開始時にコンソールに出力
        console.log('Tutorial step started:', step);
      }
    });

    return driverRef.current;
  }, []);

  /**
   * チュートリアルを開始
   */
  const startTutorial = useCallback(() => {
    const driverInstance = initializeDriver();
    
    // 少し遅延させてDOMの準備を待つ
    setTimeout(() => {
      try {
        driverInstance.drive();
      } catch (error) {
        console.error('Failed to start tutorial:', error);
      }
    }, 500);
  }, [initializeDriver]);

  /**
   * チュートリアルを強制終了
   */
  const exitTutorial = useCallback(() => {
    if (driverRef.current) {
      try {
        driverRef.current.destroy();
        // 離脱時もlocalStorageに記録（完了扱い）
        localStorage.setItem(STORAGE_KEY, 'true');
        setIsFirstTime(false);
      } catch (error) {
        console.error('Failed to exit tutorial:', error);
      }
    }
  }, []);


  /**
   * チュートリアル履歴をリセット（開発用）
   */
  const resetTutorialHistory = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setIsFirstTime(true);
    } catch (error) {
      console.warn('Failed to reset tutorial history:', error);
    }
  }, []);

  // 初回マウント時に履歴をチェック
  useEffect(() => {
    checkTutorialHistory();
  }, [checkTutorialHistory]);

  /**
   * 再受講ボタンコンポーネント
   */
  const TutorialButton = useCallback(() => (
    <Button
      kind="ghost"
      onClick={startTutorial}
      className="flex items-center gap-2 text-sm"
      title="チュートリアルをもう一度見る"
    >
      <i className="mdi mdi-help-circle-outline" />
      <span className="hidden sm:inline">チュートリアル</span>
    </Button>
  ), [startTutorial]);

  return {
    startTutorial,
    exitTutorial,
    resetTutorialHistory,
    isFirstTime,
    isLoading,
    TutorialButton
  };
}
