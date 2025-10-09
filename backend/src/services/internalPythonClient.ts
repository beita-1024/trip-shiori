import axios, { AxiosInstance } from 'axios';

/**
 * 内部FastAPI呼び出しクライアント。
 *
 * @summary FastAPIの/internal/aiエンドポイントを内部HTTPで呼び出す
 * @remarks X-Internal-Tokenヘッダを自動付与し、外部からの直接アクセスを防止
 */
class InternalPythonClient {
  private http: AxiosInstance;
  private internalToken: string;

  constructor() {
    const baseURL = process.env.INTERNAL_AI_BASE_URL || 'http://127.0.0.1:6000';
    this.internalToken = process.env.INTERNAL_AI_TOKEN || '';
    this.http = axios.create({ baseURL, timeout: 30000 });
    this.http.interceptors.request.use((config) => {
      config.headers = config.headers || {};
      config.headers['X-Internal-Token'] = this.internalToken;
      return config;
    });
  }

  /**
   * @summary イベント補完を実行
   * @param body リクエストボディ（event1, event2, dummy?）
   * @returns 生成イベント
   */
  async eventsComplete(body: unknown): Promise<unknown> {
    // テスト環境ではモックレスポンスを返す
    if (process.env.NODE_ENV === 'test') {
      return {
        time: '11:00',
        end_time: '11:30',
        title: '移動',
        description: '移動します。',
        icon: 'mdi-train',
      };
    }

    try {
      const res = await this.http.post('/internal/ai/events-complete', body);
      return res.data;
    } catch (error: any) {
      console.error('FastAPI eventsComplete error:', error.message);
      
      // FastAPIが利用できない場合はダミーレスポンスを返す
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        console.warn('FastAPI service unavailable, returning dummy response');
        return {
          time: '11:00',
          end_time: '11:30',
          title: '移動',
          description: 'AI機能が一時的に利用できません。移動時間として設定されました。',
          icon: 'mdi-train',
        };
      }
      
      throw error;
    }
  }

  /**
   * @summary 旅程編集を実行
   * @param body リクエストボディ（originalItinerary, editPrompt）
   * @returns 編集結果（Python側はシンプルなレスポンスのみ）
   */
  async itineraryEdit(body: unknown): Promise<unknown> {
    // テスト環境ではモックレスポンスを返す
    if (process.env.NODE_ENV === 'test') {
      const requestBody = body as {
        originalItinerary: unknown;
        editPrompt: string;
      };
      return {
        modifiedItinerary: requestBody.originalItinerary,
        changeDescription: 'テスト用の変更が適用されました',
      };
    }

    try {
      const res = await this.http.post('/internal/ai/itinerary-edit', body);
      return res.data;
    } catch (error: any) {
      console.error('FastAPI itineraryEdit error:', error.message);
      
      // FastAPIが利用できない場合はエラーを投げる（旅程編集は必須機能）
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        console.warn('FastAPI service unavailable for itinerary edit');
        throw new Error('AI機能が一時的に利用できません。しばらく時間をおいてから再度お試しください。');
      }
      
      throw error;
    }
  }
}

export const internalPythonClient = new InternalPythonClient();
