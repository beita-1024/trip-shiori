/**
 * 旅程編集サービス
 * 
 * AIを使用して旅程を編集し、差分を生成するサービスです。
 */
import { ChatGptClient } from '../adapters/chatGptClient';
import { ModelType } from '../types/modelType';
import { Itinerary, ItineraryEditRequest, ItineraryEditResponse } from '../types/itineraryTypes';

// jsondiffpatch は ES6 モジュール形式なので、動的インポートを使用

/**
 * 旅程編集サービスクラス
 */
export class ItineraryEditService {
  private chatGptClient: ChatGptClient;
  private diffPatcher: any;

  constructor() {
    // ChatGPTクライアントの初期化
    this.chatGptClient = new ChatGptClient({
      model: ModelType.GPT_4O_MINI,
      systemContent: `あなたは旅行プランナーの専門家です。
以下の旅程データを、ユーザーの要求に従って編集してください。

旅程データの形式：
- title: 旅程のタイトル
- subtitle: サブタイトル（オプション）
- description: 説明（オプション）
- days: 日付ごとのイベント配列
  - date: 日付（オプション）
  - events: イベント配列
    - time: 開始時刻（HH:MM形式）
    - end_time: 終了時刻（HH:MM形式）
    - title: イベントタイトル
    - description: イベントの説明
    - icon: アイコン名（mdi-xxx形式）

編集ルール：
1. ユーザーの要求を正確に理解し、適切に旅程を修正してください
2. 時刻の整合性を保ってください（前のイベントの終了時刻と次のイベントの開始時刻が重複しないように）
3. 既存のイベントの詳細を保持しつつ、要求された変更のみを適用してください
4. 必ず有効なJSON形式で返してください
5. コメントや説明は含めず、純粋なJSONオブジェクトのみを返してください
6. iconは必ず以下のいずれかで返してください。
- "mdi-map-marker"
- "mdi-walk"
- "mdi-train"
- "mdi-bike"
- "mdi-bus"
- "mdi-airplane"
- "mdi-camera"
- "mdi-food"
- "mdi-car"
`,
      temperature: 0.7,
      timeoutMs: 60000
    });

    // JSON差分パッチャーの初期化（動的インポート）
    this.initializeDiffPatcher();
  }

  /**
   * JSON差分パッチャーを初期化する
   */
  private async initializeDiffPatcher(): Promise<void> {
    try {
      // テスト環境ではjsondiffpatchをスキップ
      if (process.env.NODE_ENV === 'test') {
        console.log('テスト環境のため、jsondiffpatchの初期化をスキップします');
        return;
      }

      // 動的インポートでjsondiffpatchを読み込み
      const jsondiffpatch = await import('jsondiffpatch');
      
      // デフォルトエクスポートまたは名前付きエクスポートを確認
      const diffPatcherModule = jsondiffpatch.default || jsondiffpatch;
      
      this.diffPatcher = diffPatcherModule.create({
        arrays: {
          detectMove: false,
          includeValueOnMove: false
        }
      });
      
      console.log('jsondiffpatch の初期化が完了しました');
    } catch (error) {
      console.error('jsondiffpatch の初期化に失敗しました:', error);
      throw new Error('差分パッチャーの初期化に失敗しました');
    }
  }

  /**
   * 旅程を編集する
   * 
   * @param request - 編集リクエスト
   * @returns 編集結果
   */
  async editItinerary(request: ItineraryEditRequest): Promise<ItineraryEditResponse> {
    try {
      // 差分パッチャーが初期化されていない場合は初期化
      if (!this.diffPatcher) {
        await this.initializeDiffPatcher();
      }

      // 1. ChatGPTを使用して旅程を編集
      const modifiedItinerary = await this.editItineraryWithAI(request);

      // 2. 差分を生成
      const diffPatch = this.generateDiff(request.originalItinerary, modifiedItinerary);

      // 3. 差分を自然言語に変換
      const changeDescription = await this.generateChangeDescription(diffPatch, request.editPrompt);

      return {
        modifiedItinerary,
        diffPatch,
        changeDescription
      };
    } catch (error) {
      console.error('旅程編集エラー:', error);
      throw new Error(`旅程の編集に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * AIを使用して旅程を編集する
   * 
   * @param request - 編集リクエスト
   * @returns 編集された旅程
   */
  private async editItineraryWithAI(request: ItineraryEditRequest): Promise<Itinerary> {
    const prompt = `以下の旅程データを、ユーザーの要求に従って編集してください。

元の旅程データ：
${JSON.stringify(request.originalItinerary, null, 2)}

ユーザーの要求：
${request.editPrompt}

 編集ルール：
 1. ユーザーの要求を正確に理解し、適切に旅程を修正してください
 2. タイトルが空文字の場合は、内容に応じた適切なタイトルを設定してください
 3. 時刻の整合性を保ってください（前のイベントの終了時刻と次のイベントの開始時刻が重複しないように）
 4. 既存のイベントの詳細を保持しつつ、要求された変更のみを適用してください
 5. 必ず有効なJSON形式で返してください
 6. コメントや説明は含めず、純粋なJSONオブジェクトのみを返してください

編集された旅程データをJSON形式で返してください。`;

    const response = await this.chatGptClient.callChat({
      userContent: prompt,
      maxTokens: 4000
    });

    try {
      // レスポンスからJSONを抽出
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AIの応答からJSONを抽出できませんでした');
      }

      const modifiedItinerary = JSON.parse(jsonMatch[0]);
      
      // 型チェック
      if (!this.isValidItinerary(modifiedItinerary)) {
        throw new Error('AIが生成した旅程データの形式が無効です');
      }

      return modifiedItinerary;
    } catch (error) {
      console.error('AI応答の解析エラー:', error);
      console.error('AI応答:', response);
      throw new Error('AIが生成した旅程データの解析に失敗しました');
    }
  }

  /**
   * 旅程の差分を生成する
   * 
   * @param original - 元の旅程
   * @param modified - 変更後の旅程
   * @returns 差分パッチ
   */
  private generateDiff(original: Itinerary, modified: Itinerary): any {
    if (!this.diffPatcher) {
      console.warn('差分パッチャーが初期化されていません。空の差分を返します。');
      return {};
    }
    
    try {
      return this.diffPatcher.diff(original, modified);
    } catch (error) {
      console.error('差分パッチの生成に失敗しました:', error);
      return {};
    }
  }

  /**
   * 差分を自然言語に変換する
   * 
   * @param diffPatch - 差分パッチ
   * @param originalPrompt - 元のユーザープロンプト
   * @returns 変更内容の説明
   */
  private async generateChangeDescription(diffPatch: any, originalPrompt: string): Promise<string> {
    if (!diffPatch) {
      return '変更はありませんでした。';
    }

    const prompt = `以下のJSON差分パッチを分析して、どのような変更が行われたかを自然言語で説明してください。

ユーザーの元の要求：
${originalPrompt}

差分パッチ：
${JSON.stringify(diffPatch, null, 2)}

変更内容を簡潔に説明してください（100文字以内）。`;

    try {
      const description = await this.chatGptClient.callChat({
        userContent: prompt,
        maxTokens: 200
      });

      return description.trim();
    } catch (error) {
      console.error('差分説明生成エラー:', error);
      return '変更内容の説明を生成できませんでした。';
    }
  }

  /**
   * 旅程データの妥当性をチェックする
   * 
   * @param data - チェックするデータ
   * @returns 妥当性
   */
  private isValidItinerary(data: any): data is Itinerary {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof data.title === 'string' &&
      Array.isArray(data.days) &&
      data.days.length > 0 &&
      data.days.every((day: any) => 
        typeof day === 'object' &&
        day !== null &&
        Array.isArray(day.events) &&
        day.events.length > 0 &&
        day.events.every((event: any) =>
          typeof event === 'object' &&
          event !== null &&
          typeof event.time === 'string' &&
          typeof event.end_time === 'string' &&
          typeof event.title === 'string' &&
          typeof event.description === 'string' &&
          typeof event.icon === 'string'
        )
      )
    );
  }
}
