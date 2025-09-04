import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { generateRandomId } from '../utils/idGenerator';

const prisma = new PrismaClient();

/**
 * 旅のしおりを作成する
 * 
 * @param req - Expressリクエストオブジェクト
 * @param res - Expressレスポンスオブジェクト
 * @example
 * POST /api/itineraries
 * Body: { title: "Tokyo Trip", start_date: "2025-09-01", ... }
 */
export const createItinerary = async (req: Request, res: Response) => {
  const payload = req.body ?? {};
  // Rails 実装に合わせて body 全体を JSON 文字列として保存する（互換性維持）
  const dataString = JSON.stringify(payload);

  console.debug("Received payload:", payload); // デバッグ用: 受け取ったペイロードを表示

  const MAX_ATTEMPTS = 10;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const candidateId = generateRandomId(20);

    try {
      const created = await prisma.itinerary.create({
        data: {
          id: candidateId,
          // Prisma のスキーマに応じて `data` が string/text か Json かに合わせる設計を想定。
          // ここでは互換性のため文字列を保存する実装にしている（Rails と同等の扱い）。
          data: dataString,
        },
      });

      console.debug("Created itinerary with ID:", created.id); // デバッグ用: 作成した旅のしおりのIDを表示
      return res.status(201).json({ id: created.id });
    } catch (err) {
      // Prisma の一意制約違反 (P2002) が返ることがある → 別IDで再試行
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        // 衝突（非常に稀） → 再試行
        if (attempt === MAX_ATTEMPTS) {
          console.error("Failed to generate unique id after multiple attempts."); // デバッグ用: 複数回の試行後に失敗したことを表示
          return res.status(500).json({ errors: ["Failed to generate unique id (too many collisions)"] });
        }
        continue;
      }

      // その他のエラーは 422 相当で返す（Rails 実装は save failure で 422）
      console.error("create itinerary error:", err);
      return res.status(422).json({ errors: [String((err as Error).message || err)] });
    }
  }

  // 到達しないはず
  console.error("Unexpected error: Failed to create itinerary."); // デバッグ用: 予期しないエラーを表示
  return res.status(500).json({ errors: ["Failed to create itinerary"] });
};

/**
 * 指定されたIDの旅のしおりを取得する
 * 
 * @param req - Expressリクエストオブジェクト
 * @param res - Expressレスポンスオブジェクト
 * @example
 * GET /api/itineraries/:id
 */
export const getItinerary = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const itinerary = await prisma.itinerary.findUnique({
      where: { id },
    });

    if (!itinerary) {
      return res.status(404).json({ error: "Itinerary not found" });
    }

    // itinerary.data が string (Rails の old style) なら JSON.parse して返し、
    // すでにオブジェクト（Prisma Json）ならそのまま返す。
    const stored = (itinerary as any).data;
    if (typeof stored === "string") {
      try {
        const parsed = JSON.parse(stored);
        return res.status(200).json(parsed);
      } catch (parseErr) {
        // もし文字列だが JSON にパースできない場合はそのまま返す（互換性重視）
        return res.status(200).json(stored);
      }
    } else {
      return res.status(200).json(stored);
    }
  } catch (err) {
    console.error("fetch itinerary error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * 全ての旅のしおりを取得する
 * 
 * @param req - Expressリクエストオブジェクト
 * @param res - Expressレスポンスオブジェクト
 * @example
 * GET /api/itineraries
 */
export const getAllItineraries = async (req: Request, res: Response) => {
  const itineraries = await prisma.itinerary.findMany();
  res.json(itineraries);
};
