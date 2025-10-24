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
  private aiBaseUrl: string;

  constructor() {
    this.aiBaseUrl = process.env.INTERNAL_AI_BASE_URL || 'http://ai:3000';
    this.internalToken = process.env.INTERNAL_AI_TOKEN || '';
    this.http = axios.create({ baseURL: this.aiBaseUrl, timeout: 30000 });

    // 送信前にヘッダを付与
    this.http.interceptors.request.use(async (config) => {
      config.headers = config.headers || {};

      // NOTE: X-Internal-Token はローカル/将来の再導入に備えて保持。
      // 本番の一次認証は Cloud Run の ID トークン + roles/run.invoker。
      // 既存のアプリ層ガード（ローカル/Compose向け）
      if (this.internalToken) {
        (config.headers as Record<string, string>)['X-Internal-Token'] =
          this.internalToken;
      }

      // Cloud Run 上では ID トークンを自動付与（追加依存なし）
      const idToken = await this.maybeGetIdToken(this.aiBaseUrl).catch(
        () => null
      );
      if (idToken) {
        (config.headers as Record<string, string>)['Authorization'] =
          `Bearer ${idToken}`;
      }

      return config;
    });
  }

  /**
   * Cloud Run 実行時のみメタデータサーバから ID トークンを取得。
   * ローカル/Compose 等では何もしない（null を返す）。
   */
  private async maybeGetIdToken(audience: string): Promise<string | null> {
    // Cloud Run 環境判定（K_SERVICE は自動注入）
    if (!process.env.K_SERVICE) return null;

    try {
      const url = `http://metadata/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(
        audience
      )}&format=full`;
      const res = await fetch(url, {
        headers: { 'Metadata-Flavor': 'Google' },
      });
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }

  /**
   * @summary FastAPIヘルスチェック
   * @returns FastAPIのヘルス応答
   */
  async health(): Promise<unknown> {
    const res = await this.http.get('/health');
    return res.data;
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
          description:
            'AI機能が一時的に利用できません。移動時間として設定されました。',
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
        throw new Error(
          'AI機能が一時的に利用できません。しばらく時間をおいてから再度お試しください。'
        );
      }

      throw error;
    }
  }
}

export const internalPythonClient = new InternalPythonClient();
