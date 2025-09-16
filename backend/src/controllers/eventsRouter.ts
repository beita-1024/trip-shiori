/**
 * イベント補完機能のルーター
 * 
 * 2つのイベントの間に新しいイベントを生成するAI機能を提供します。
 * ChatGPT APIを使用してJSON形式のイベントデータを生成し、スキーマ検証を行います。
 * 
 * @example
 * POST /api/events/complete
 * Body: { "event1": { time: "10:00", title: "出発" }, "event2": { time: "12:00", title: "到着" } }
 * Response: { time: "11:00", end_time: "11:30", title: "移動", description: "電車で移動", icon: "mdi-train" }
 */
import express, { Request, Response } from "express";
import { ChatGptClient } from "../adapters/chatGptClient";
import { JsonCompleter } from "../services/jsonCompleter";
import { ModelType } from "../types/modelType";

const router = express.Router();

/**
 * 2つのイベントの間に新しいイベントを生成する
 * 
 * @param req - Expressリクエストオブジェクト
 * @param req.body.event1 - 最初のイベントオブジェクト
 * @param req.body.event2 - 2番目のイベントオブジェクト
 * @param req.body.dummy - ダミーモードフラグ（オプション）
 * @param req.headers.x-user-id - ユーザーID（オプション）
 * @param res - Expressレスポンスオブジェクト
 * @example
 * POST /api/events/complete
 * Body: { "event1": { time: "10:00", title: "出発" }, "event2": { time: "12:00", title: "到着" } }
 */
router.post("/complete", async (req: Request, res: Response) => {
  try {
    // リクエスト開始時刻を記録
    const startedAtMs = Date.now();
    const userId = req.headers["x-user-id"] as string | undefined;
    
    console.log(
      `[eventsRouter] POST /api/events/complete start userId=${userId ?? "-"} body=`,
      req.body
    );

    // リクエストボディからイベントデータを取得
    const { event1, event2, dummy } = req.body ?? {};
    if (!event1 || !event2) {
      // console.warn(
      //   `[eventsRouter] POST /api/events/complete missing required fields userId=${userId ?? "-"}`
      // );
      return res.status(400).json({ error: "event1 and event2 are required in body" });
    }

    // イベントデータをJSON文字列に変換（Rails実装との互換性のため）
    const input1 = JSON.stringify(event1);
    const input2 = JSON.stringify(event2);
    console.debug(`[eventsRouter] Inputs stringified: input1=${input1}, input2=${input2}`);

    // ChatGPTクライアントの設定
    const chatClient = new ChatGptClient({
      model: (process.env.LLM_MODEL as any) ?? ModelType.GPT_4O_MINI,
      systemContent: "あなたは有能なアシスタントです。",
      temperature: 0.7,
      top_p: 0.9,
      n: 1,
      frequency_penalty: 0.5,
      timeoutMs: 30_000,
    });

    // イベントデータのJSONスキーマ定義
    const jsonSchema = {
      type: "object",
      properties: {
        time: { type: "string" },
        end_time: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        icon: { type: "string" },
      },
      required: ["time", "end_time", "title", "description", "icon"],
      additionalProperties: false,
    };

    // AIへの指示文（アイコン一覧はfrontend/src/components/iconItems.tsを参照）
    const completionRule = `２つのイベントの間を埋めるイベントを１つ作成してください。
入力と同じ形式で返してください。descriptionは詳しくしてください。
時刻は必ず "HH:MM" 形式（例: "14:30"）で返してください。ISO形式や日付を含めないでください。
iconは必ず以下のいずれかで返してください。
- "mdi-map-marker"
- "mdi-walk"
- "mdi-train"
- "mdi-bike"
- "mdi-bus"
- "mdi-airplane"
- "mdi-camera"
- "mdi-food"
- "mdi-car"
`;

    // JSON補完サービスの初期化
    const completer = new JsonCompleter({
      chatClient,
      jsonSchema,
      completionRule,
      debug: process.env.DEBUG === "1",
      dummy: !!dummy,
      maxAttempts: 5,
    });

    // AIによるイベント生成実行
    const resultObj = await completer.completeJson({
      inputJsonStr1: input1,
      inputJsonStr2: input2,
      userId,
    });

    // 成功ログ出力
    console.log(
      `[eventsRouter] POST /api/events/complete success userId=${userId ?? "-"} durationMs=${Date.now() - startedAtMs}`
    );

    // 検証済みのイベントオブジェクトを返却
    return res.json(resultObj);
  } catch (err: any) {
    console.error("events.complete error:", err);
    return res.status(422).json({ error: String(err?.message ?? err) });
  }
});

export default router;
