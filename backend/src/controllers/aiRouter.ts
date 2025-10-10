import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import { internalPythonClient } from '../services/internalPythonClient';
import { authenticateToken } from '../middleware/auth';
import { Itinerary } from '../types/itineraryTypes';
import type { Delta } from 'jsondiffpatch';

const router = Router();

// スキーマ（docs/api/openapi.yaml 準拠）
const EventSchema = z.object({
  time: z.string(),
  end_time: z.string(),
  title: z.string(),
  description: z.string(),
  icon: z.string(),
});

const EventsCompleteBody = z.object({
  event1: EventSchema,
  event2: EventSchema,
  dummy: z.boolean().optional(),
});

const ItinerarySchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  days: z
    .array(
      z.object({
        date: z
          .string()
          .refine((val) => !val || !isNaN(Date.parse(val)), {
            message: '有効な日付文字列である必要があります',
          })
          .optional(),
        events: z.array(EventSchema),
      })
    )
    .nonempty(),
});

const ItineraryEditBody = z.object({
  originalItinerary: ItinerarySchema,
  editPrompt: z.string().min(1).max(1000),
});

/**
 * 旅程の差分を生成する（jsondiffpatchを使用）
 * @param original - 元の旅程
 * @param modified - 変更後の旅程
 * @returns 差分パッチ
 * @throws Error 差分生成に失敗した場合
 */
async function generateDiffPatch(
  original: Itinerary,
  modified: Itinerary
): Promise<Delta | undefined> {
  // テスト環境ではjsondiffpatchをスキップ
  if (process.env.NODE_ENV === 'test') {
    return undefined;
  }

  // jsondiffpatchを動的インポート
  const { create } = await import('jsondiffpatch');

  const diffPatcher = create({
    objectHash: (obj: any, index?: number) => obj.id || `${index ?? 0}`,
    arrays: {
      detectMove: false,
      includeValueOnMove: false,
    },
  });

  return diffPatcher.diff(original, modified);
}

/**
 * @summary AI: イベント補完
 * @auth Cookie JWT required via authenticateToken middleware
 * @params body.event1 Event - 補完対象の最初のイベント
 * @params body.event2 Event - 補完対象の2番目のイベント
 * @params body.dummy? boolean - オプションのダミーフラグ
 * @returns 200 { event: Event } - 補完されたイベントデータ
 * @errors 400 invalid_body - リクエストバリデーション失敗
 * @errors 401 unauthorized - 認証失敗
 * @errors 422 AI generation failed - LLM生成エラー
 * @errors 502 service_unavailable - 内部AIサービス利用不可
 * @errors 500 internal_server_error - 予期しないサーバーエラー
 */
export const postEventsComplete: RequestHandler = async (req, res) => {
  const parse = EventsCompleteBody.safeParse(req.body);
  if (!parse.success) {
    return res
      .status(400)
      .json({ error: 'invalid_body', details: parse.error.issues });
  }
  try {
    const data = await internalPythonClient.eventsComplete(parse.data);
    return res.status(200).json(data);
  } catch (e: any) {
    const status = e?.response?.status;
    if (status === 403)
      return res.status(502).json({ error: 'service_unavailable', message: 'Internal AI service authentication failed' });
    if (status === 422)
      return res.status(422).json({ error: 'AI generation failed' });
    return res.status(500).json({ error: 'internal_server_error' });
  }
};

/**
 * @summary AI: 旅程編集
 * @auth Cookie JWT required via authenticateToken middleware
 * @params body.originalItinerary Itinerary - 元の旅程データ
 * @params body.editPrompt string - 編集指示（1-1000文字）
 * @returns 200 { success: true, data: ItineraryEditResponse } - 差分パッチ付きの編集済み旅程
 * @errors 400 invalid_body - リクエストバリデーション失敗
 * @errors 401 unauthorized - 認証失敗
 * @errors 422 AI generation failed - LLM生成エラー
 * @errors 502 service_unavailable - 内部AIサービス利用不可
 * @errors 500 internal_server_error - 予期しないサーバーエラー
 */
export const postItineraryEdit: RequestHandler = async (req, res) => {
  const parse = ItineraryEditBody.safeParse(req.body);
  if (!parse.success) {
    return res
      .status(400)
      .json({ error: 'invalid_body', details: parse.error.issues });
  }
  try {
    // Python側からシンプルなレスポンスを取得
    const pythonResponse = (await internalPythonClient.itineraryEdit(
      parse.data
    )) as {
      modifiedItinerary: Itinerary;
      changeDescription: string;
    };

    // TypeScript側でdiffPatchを生成
    let diffPatch: Delta | undefined;
    try {
      diffPatch = await generateDiffPatch(
        parse.data.originalItinerary,
        pythonResponse.modifiedItinerary
      );
    } catch (diffError) {
      console.error('差分パッチの生成に失敗しました:', diffError);
      // 差分生成に失敗しても旅程編集は成功として扱う
      diffPatch = undefined;
    }

    // 完全なレスポンスを構築
    const data = {
      modifiedItinerary: pythonResponse.modifiedItinerary,
      diffPatch,
      changeDescription: pythonResponse.changeDescription,
    };

    return res.status(200).json({ success: true, data });
  } catch (e: any) {
    const status = e?.response?.status;
    if (status === 403)
      return res.status(502).json({ error: 'service_unavailable', message: 'Internal AI service authentication failed' });
    if (status === 422)
      return res
        .status(422)
        .json({ success: false, error: 'AI generation failed' });
    return res
      .status(500)
      .json({ success: false, error: 'internal_server_error' });
  }
};

router.post('/events/complete', authenticateToken, postEventsComplete);
router.post('/itinerary-edit', authenticateToken, postItineraryEdit);

export default router;
