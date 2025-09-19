/**
 * 旅程編集コントローラー
 *
 * 旅程編集機能のHTTPリクエストを処理するコントローラーです。
 */
import { Request, Response } from 'express';
import { z } from 'zod';
import { ItineraryEditService } from '../services/itineraryEditService';

/**
 * 旅程編集リクエストのZodスキーマ
 */
const EditSchema = z.object({
  originalItinerary: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    days: z.array(
      z.object({
        date: z.coerce.date().optional(),
        events: z.array(
          z.object({
            title: z.string(),
            time: z.string(),
            end_time: z.string(),
            description: z.string(),
            icon: z.string(),
          })
        ),
      })
    ),
  }),
  editPrompt: z.string().trim().min(1, 'editPrompt is required'),
});

/**
 * 旅程編集サービスインスタンス
 */
const itineraryEditService = new ItineraryEditService();

/**
 * @summary 旅程を編集し、変更差分と説明を返す
 * @auth 必須（Bearer JWT）。所有者のみ編集可（ルーター/ミドルウェアで検証想定）
 * @params Body: { originalItinerary, editPrompt }（Zod等で検証）
 * @returns 200: { success: true, data: { modifiedItinerary, diffPatch, changeDescription } }
 * @errors 400/401/403/422/500（詳細はProblem Details相当のJSONで返却）
 * @example
 * POST /api/itineraries/:id/edit
 * Body: { "originalItinerary": {...}, "editPrompt": "2日目に美術館を追加" }
 */
export async function editItinerary(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // リクエストボディ最終検証（Zod）
    const parsed = EditSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        type: '/errors/invalid_request',
        title: 'Unprocessable Entity',
        status: 422,
        detail: '入力が不正です',
        errors: parsed.error.issues,
      });
      return;
    }
    const { originalItinerary, editPrompt } = parsed.data;

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
        events: day.events?.map((event) => ({
          title: event.title,
          time: event.time,
          end_time: event.end_time,
          description: event.description,
        })),
      })),
    });
    console.log('==============================');

    // 旅程編集サービスの呼び出し
    const result = await itineraryEditService.editItinerary({
      originalItinerary,
      editPrompt,
    });

    // レスポンスの詳細デバッグログ
    console.log('=== 旅程編集レスポンス詳細 ===');
    console.log('変更後の旅程タイトル:', result.modifiedItinerary.title);
    console.log('変更説明:', result.changeDescription);
    console.log('差分パッチ:', JSON.stringify(result.diffPatch, null, 2));
    console.log(
      '変更後の旅程データ構造:',
      JSON.stringify(result.modifiedItinerary, null, 2)
    );
    console.log('==============================');

    // 成功レスポンス
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    // エラーの詳細デバッグログ
    console.error('=== 旅程編集エラー詳細 ===');
    console.error('エラータイプ:', error?.constructor?.name);
    console.error(
      'エラーメッセージ:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    console.error(
      'エラースタック:',
      error instanceof Error ? error.stack : 'No stack trace'
    );
    console.error('リクエストボディ:', JSON.stringify(req.body, null, 2));
    console.error('==============================');

    // エラーレスポンス
    res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: '旅程の編集に失敗しました',
    });
  }
}
