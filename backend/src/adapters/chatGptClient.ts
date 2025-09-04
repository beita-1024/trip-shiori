/**
 * ChatGPT (OpenAI) APIクライアント
 * 
 * OpenAIのChatGPT APIを呼び出すための低レベルクライアントです。
 * RubyのChatGPTClientをTypeScriptに移植したものです。
 * 
 * @example
 * const client = new ChatGptClient({ 
 *   model: ModelType.GPT_4O_MINI, 
 *   systemContent: 'あなたは有能なアシスタントです。' 
 * });
 * const response = await client.callChat({ userContent: 'こんにちは' });
 */
import { ModelTypeKey, VALID_MODELS, isValidModel } from "../types/modelType";

/**
 * ChatGptClientの設定オプション
 */
export type ChatGptClientOptions = {
  /** 使用するOpenAIモデル */
  model: ModelTypeKey;
  /** システムプロンプト（デフォルト: "You are a helpful assistant."） */
  systemContent?: string;
  /** 温度パラメータ（0.0-2.0、デフォルト: undefined） */
  temperature?: number;
  /** Top-pパラメータ（0.0-1.0、デフォルト: undefined） */
  top_p?: number;
  /** 生成するレスポンス数（デフォルト: undefined） */
  n?: number;
  /** 生成を停止する文字列（デフォルト: undefined） */
  stop?: string | string[];
  /** 頻度ペナルティ（-2.0-2.0、デフォルト: undefined） */
  frequency_penalty?: number;
  /** タイムアウト時間（ミリ秒、デフォルト: 30000） */
  timeoutMs?: number;
};

/**
 * OpenAI ChatGPT APIクライアントクラス
 * 
 * 非同期でChatGPT APIを呼び出し、テキストレスポンスを取得します。
 * エラーハンドリング、タイムアウト、型安全性を提供します。
 */
export class ChatGptClient {
  private model: ModelTypeKey;
  private systemContent: string;
  private temperature?: number;
  private top_p?: number;
  private n?: number;
  private stop?: string | string[];
  private frequency_penalty?: number;
  private timeoutMs: number;

  private apiUrl = "https://api.openai.com/v1/chat/completions";
  private apiKey: string;

  /**
   * ChatGptClientのインスタンスを作成する
   * 
   * @param opts - クライアントの設定オプション
   * @throws {Error} 無効なモデルが指定された場合
   * @throws {Error} OPENAI_API_KEY環境変数が設定されていない場合
   * @example
   * const client = new ChatGptClient({
   *   model: ModelType.GPT_4O_MINI,
   *   systemContent: "あなたは有能なアシスタントです。",
   *   temperature: 0.7,
   *   timeoutMs: 30000
   * });
   */
  constructor(opts: ChatGptClientOptions) {
    if (!isValidModel(opts.model)) {
      throw new Error(`Invalid model: ${opts.model}. valid: ${VALID_MODELS.join(", ")}`);
    }
    this.model = opts.model;
    this.systemContent = opts.systemContent ?? "You are a helpful assistant.";
    this.temperature = opts.temperature;
    this.top_p = opts.top_p;
    this.n = opts.n;
    this.stop = opts.stop;
    this.frequency_penalty = opts.frequency_penalty;
    this.timeoutMs = opts.timeoutMs ?? 30_000;

    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not set in environment");
    this.apiKey = key;
  }

  /**
   * ChatGPT APIを呼び出してテキストレスポンスを取得する
   * 
   * @param params - API呼び出しパラメータ
   * @param params.userContent - ユーザーからの入力テキスト
   * @param params.maxTokens - 最大トークン数（デフォルト: 1000）
   * @param params.userId - ユーザーID（オプション、ログ用）
   * @returns ChatGPTからのレスポンステキスト
   * @throws {Error} API呼び出しに失敗した場合
   * @throws {Error} タイムアウトした場合
   * @example
   * const response = await client.callChat({
   *   userContent: "今日の天気について教えてください",
   *   maxTokens: 500,
   *   userId: "user123"
   * });
   */
  public async callChat({
    userContent,
    maxTokens = 1000,
    userId,
  }: {
    userContent: string;
    maxTokens?: number;
    userId?: string;
  }): Promise<string> {
    // APIリクエストボディの構築
    const body: any = {
      model: this.model,
      messages: [
        { role: "system", content: this.systemContent },
        { role: "user", content: userContent },
      ],
      max_tokens: maxTokens,
      stream: false,
    };

    // オプションパラメータの設定
    if (userId) body.user = userId;
    if (this.temperature !== undefined) body.temperature = this.temperature;
    if (this.top_p !== undefined) body.top_p = this.top_p;
    if (this.n !== undefined) body.n = this.n;
    if (this.stop !== undefined) body.stop = this.stop;
    if (this.frequency_penalty !== undefined) body.frequency_penalty = this.frequency_penalty;

    // タイムアウト制御の設定
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      // OpenAI APIへのリクエスト送信
      const res = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // レスポンスの処理
      const text = await res.text();
      if (!res.ok) {
        // エラーレスポンスの詳細情報を抽出
        try {
          const parsed = JSON.parse(text);
          const errMsg = parsed?.error?.message ?? text;
          throw new Error(`OpenAI API error ${res.status}: ${errMsg}`);
        } catch {
          throw new Error(`OpenAI API error ${res.status}: ${text}`);
        }
      }

      // 正常レスポンスの解析
      const json = JSON.parse(text);
      // choices[0].message.content または choices[0].text からレスポンスを取得
      const message = json?.choices?.[0]?.message?.content ?? json?.choices?.[0]?.text;
      return (message ?? "").trim();
    } catch (err: any) {
      // タイムアウトエラーの特別処理
      if (err.name === "AbortError") {
        throw new Error("OpenAI request timed out");
      }
      throw err;
    }
  }
}
