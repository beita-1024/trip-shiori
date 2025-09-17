/**
 * JSON補完サービス
 *
 * ChatGPT APIを使用して2つのJSONデータの間に新しいJSONデータを生成し、
 * JSONスキーマ検証を行います。ダミーモードとリトライ機能を提供します。
 *
 * @example
 * const completer = new JsonCompleter({
 *   chatClient,
 *   jsonSchema,
 *   completionRule,
 *   debug: true
 * });
 * const result = await completer.completeJson({
 *   inputJsonStr1: '{"time": "10:00"}',
 *   inputJsonStr2: '{"time": "12:00"}'
 * });
 */
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { ChatGptClient } from '../adapters/chatGptClient';

/** JSONスキーマの型定義 */
export type JsonSchema = object | Record<string, unknown>;

/**
 * JsonCompleterの設定オプション
 */
export type JsonCompleterOptions = {
  /** ChatGPT APIクライアント */
  chatClient: ChatGptClient;
  /** 生成されるJSONのスキーマ定義 */
  jsonSchema: JsonSchema;
  /** AIへの指示文（補完ルール） */
  completionRule: string;
  /** デバッグモード（デフォルト: false） */
  debug?: boolean;
  /** ダミーモード（デフォルト: false） */
  dummy?: boolean;
  /** 最大リトライ回数（デフォルト: 5） */
  maxAttempts?: number;
};

/**
 * JSON補完サービスクラス
 *
 * 2つのJSONデータの間に新しいJSONデータを生成し、スキーマ検証を行います。
 * リトライ機能、ダミーモード、デバッグ機能を提供します。
 */
export class JsonCompleter {
  private chatClient: ChatGptClient;
  private jsonSchema: JsonSchema;
  private completionRule: string;
  private debug: boolean;
  private dummy: boolean;
  private maxAttempts: number;
  private ajv: Ajv;
  private validator: ValidateFunction;

  /**
   * JsonCompleterのインスタンスを作成する
   *
   * @param opts - 設定オプション
   * @example
   * const completer = new JsonCompleter({
   *   chatClient: new ChatGptClient({ model: ModelType.GPT_4O_MINI }),
   *   jsonSchema: { type: "object", properties: { time: { type: "string" } } },
   *   completionRule: "時刻の間を埋めるイベントを作成してください",
   *   debug: true,
   *   maxAttempts: 3
   * });
   */
  constructor(opts: JsonCompleterOptions) {
    this.chatClient = opts.chatClient;
    this.jsonSchema = opts.jsonSchema;
    this.completionRule = opts.completionRule;
    this.debug = !!opts.debug;
    this.dummy = !!opts.dummy;
    this.maxAttempts = opts.maxAttempts ?? 5;

    // AJVバリデーターの初期化
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
    this.validator = this.ajv.compile(this.jsonSchema as object);
  }

  /**
   * 2つのJSONデータの間に新しいJSONデータを生成する
   *
   * @param params - 補完パラメータ
   * @param params.inputJsonStr1 - 最初のJSONデータ（文字列）
   * @param params.inputJsonStr2 - 2番目のJSONデータ（文字列）
   * @param params.userId - ユーザーID（オプション、ログ用）
   * @returns 検証済みのJavaScriptオブジェクト
   * @throws {Error} スキーマ検証に失敗した場合
   * @throws {Error} 最大リトライ回数に達した場合
   * @example
   * const result = await completer.completeJson({
   *   inputJsonStr1: '{"time": "10:00", "title": "出発"}',
   *   inputJsonStr2: '{"time": "12:00", "title": "到着"}',
   *   userId: "user123"
   * });
   */
  public async completeJson({
    inputJsonStr1,
    inputJsonStr2,
    userId,
  }: {
    inputJsonStr1: string;
    inputJsonStr2: string;
    userId?: string;
  }): Promise<any> {
    // ダミーモードの場合は固定オブジェクトを返す
    if (this.dummy) {
      if (this.debug)
        console.log('[JsonCompleter] dummy mode - returning fixed object');
      return {
        title: 'ダミーイベント',
        time: '15:00',
        end_time: '16:00',
        description: 'これはダミーのイベントです。',
        icon: 'mdi-dummy-icon',
      };
    }

    let attempts = 0;
    let lastErr: Error | null = null;

    // リトライループ
    while (attempts < this.maxAttempts) {
      attempts += 1;
      try {
        // AIによる補完実行
        const completed = await this.performCompletion(
          inputJsonStr1,
          inputJsonStr2,
          userId
        );

        // スキーマ検証
        const ok = this.validator(completed);
        if (!ok) {
          const errText = JSON.stringify(this.validator.errors, null, 2);
          throw new Error(`Schema validation failed: ${errText}`);
        }
        return completed;
      } catch (err: any) {
        lastErr = err;
        if (this.debug)
          console.warn(
            `[JsonCompleter] attempt ${attempts} failed: ${err.message}`
          );
        if (attempts >= this.maxAttempts) break;

        // 指数バックオフ（軽い遅延）
        await new Promise((r) => setTimeout(r, 300 * attempts));
      }
    }

    throw lastErr ?? new Error('JsonCompleter failed without error');
  }

  /**
   * AIへのプロンプトを構築する
   *
   * @param jsonStr1 - 最初のJSONデータ
   * @param jsonStr2 - 2番目のJSONデータ
   * @returns 構築されたプロンプト文字列
   */
  private buildPrompt(jsonStr1: string, jsonStr2: string): string {
    // Ruby実装に沿ったプロンプト構築
    return `
以下の2つのJSONデータを基に、指定された補完ルールに従って、
これらの間を埋めるようにJSONデータを生成して補完した部分だけを返してください。
生成後のデータは有効なプレーンなJSON形式で返してください。
JSON以外のテキストはすべて含めないでください。

補完ルール:
${this.completionRule}

JSON Schema:
${JSON.stringify(this.jsonSchema)}

入力JSON 1:
${jsonStr1}

入力JSON 2:
${jsonStr2}

補完後JSON:
`.trim();
  }

  /**
   * ChatGPT APIを使用してJSON補完を実行する
   *
   * @param jsonStr1 - 最初のJSONデータ
   * @param jsonStr2 - 2番目のJSONデータ
   * @param userId - ユーザーID（オプション）
   * @returns 生成されたJSONオブジェクト
   * @throws {Error} JSONパースに失敗した場合
   */
  private async performCompletion(
    jsonStr1: string,
    jsonStr2: string,
    userId?: string
  ): Promise<any> {
    // プロンプトの構築
    const prompt = this.buildPrompt(jsonStr1, jsonStr2);
    if (this.debug) {
      console.log('=== prompt ===');
      console.log(prompt);
      console.log('=== end prompt ===');
    }

    // ChatGPT APIの呼び出し
    const raw = await this.chatClient.callChat({
      userContent: prompt,
      maxTokens: 1500,
      userId,
    });

    // 曲がった引用符（U+201C/U+201D/U+2018/U+2019）と全角（U+FF02/U+FF07）のみを ASCII に正規化
    const normalized = raw
      .replace(/[\u201C\u201D\uFF02]/g, '"') // " " ＂ → "
      .replace(/[\u2018\u2019\uFF07]/g, "'"); // ' ' ＇ → '

    if (this.debug) {
      console.log('=== raw response ===');
      console.log(normalized);
      console.log('=== end raw ===');
    }

    // JSONパースの試行
    try {
      // 直接パースを試行
      return JSON.parse(normalized);
    } catch {
      // 直接パースに失敗した場合、JSONブロックを抽出してパース
      const m = normalized.match(/(\{[\s\S]*\})$/);
      if (m) {
        return JSON.parse(m[1]);
      }
      throw new Error('Failed to parse JSON from model response');
    }
  }
}
