import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import { internalPythonClient } from '../services/internalPythonClient';
import { authenticateToken } from '../middleware/auth';
import { Itinerary } from '../types/itineraryTypes';

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
 */
async function generateDiffPatch(
  original: Itinerary,
  modified: Itinerary
): Promise<any> {
  try {
    // jsondiffpatchを動的インポート
    const jsondiffpatch = await import('jsondiffpatch');
    const diffPatcherModule = jsondiffpatch.default || jsondiffpatch;

    const diffPatcher = diffPatcherModule.create({
      objectHash: (obj: any) => obj.id || JSON.stringify(obj),
      arrays: {
        detectMove: false,
        includeValueOnMove: false,
      },
    });

    return diffPatcher.diff(original, modified) || {};
  } catch (error) {
    console.error('差分パッチの生成に失敗しました:', error);
    return {};
  }
}

/**
 * @summary AI: イベント補完
 * @auth Cookie JWT（既存のeventsに準拠）
 * @params body.event1, body.event2 必須
 * @returns 200: Event
 * @errors 400/401/403/422/429/500
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
      return res.status(503).json({ error: 'service_unavailable' });
    if (status === 422)
      return res.status(422).json({ error: 'AI generation failed' });
    return res.status(500).json({ error: 'internal_server_error' });
  }
};

/**
 * @summary AI: 旅程編集
 * @auth Cookie JWT（既存のitinerary-editに準拠）
 * @params body.originalItinerary, body.editPrompt 必須
 * @returns 200: { success: true, data: ItineraryEditResponse }
 * @errors 400/401/403/422/429/500
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
    const diffPatch = await generateDiffPatch(
      parse.data.originalItinerary,
      pythonResponse.modifiedItinerary
    );

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
      return res.status(503).json({ error: 'service_unavailable' });
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
