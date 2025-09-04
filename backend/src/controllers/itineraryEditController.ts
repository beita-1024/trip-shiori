/**
 * 旅程編集コントローラー
 * 
 * 旅程編集機能のHTTPリクエストを処理するコントローラーです。
 */
import { Request, Response } from 'express';
import { ItineraryEditService } from '../services/itineraryEditService';
import { ItineraryEditRequest } from '../types/itineraryTypes';

/**
 * 旅程編集サービスインスタンス
 */
const itineraryEditService = new ItineraryEditService();

/**
 * 旅程を編集する
 * 
 * @param req - Expressリクエスト
 * @param res - Expressレスポンス
 */
export async function editItinerary(req: Request, res: Response): Promise<void> {
  try {
    // リクエストボディの検証
    const { originalItinerary, editPrompt } = req.body as ItineraryEditRequest;

    if (!originalItinerary) {
      res.status(400).json({
        error: 'originalItinerary is required'
      });
      return;
    }

    if (!editPrompt || typeof editPrompt !== 'string') {
      res.status(400).json({
        error: 'editPrompt is required and must be a string'
      });
      return;
    }

    // 旅程データの基本検証
    if (!Array.isArray(originalItinerary.days)) {
      res.status(400).json({
        error: 'Invalid itinerary format: days array is required'
      });
      return;
    }

    // タイトルが未定義の場合は空文字に設定
    if (originalItinerary.title === undefined) {
      originalItinerary.title = '';
    }

    // リクエストの詳細デバッグログ
    console.log('=== 旅程編集リクエスト詳細 ===');
    console.log('リクエストボディ:', JSON.stringify(req.body, null, 2));
    console.log('旅程タイトル:', originalItinerary.title);
    console.log('旅程日数:', originalItinerary.days.length);
    console.log('編集プロンプト:', editPrompt);
    console.log('旅程データ構造:', {
      title: originalItinerary.title,
      description: originalItinerary.description,
      days: originalItinerary.days.map((day, index) => ({
        dayNumber: index + 1,
        eventsCount: day.events?.length || 0,
        events: day.events?.map(event => ({
          title: event.title,
          time: event.time,
          end_time: event.end_time,
          description: event.description
        }))
      }))
    });
    console.log('==============================');

    // 旅程編集サービスの呼び出し
    const result = await itineraryEditService.editItinerary({
      originalItinerary,
      editPrompt
    });

    // レスポンスの詳細デバッグログ
    console.log('=== 旅程編集レスポンス詳細 ===');
    console.log('変更後の旅程タイトル:', result.modifiedItinerary.title);
    console.log('変更説明:', result.changeDescription);
    console.log('差分パッチ:', JSON.stringify(result.diffPatch, null, 2));
    console.log('変更後の旅程データ構造:', JSON.stringify(result.modifiedItinerary, null, 2));
    console.log('==============================');

    // 成功レスポンス
    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    // エラーの詳細デバッグログ
    console.error('=== 旅程編集エラー詳細 ===');
    console.error('エラータイプ:', error?.constructor?.name);
    console.error('エラーメッセージ:', error instanceof Error ? error.message : 'Unknown error');
    console.error('エラースタック:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('リクエストボディ:', JSON.stringify(req.body, null, 2));
    console.error('==============================');

    // エラーレスポンス
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
