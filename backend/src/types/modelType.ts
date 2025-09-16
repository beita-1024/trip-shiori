/**
 * OpenAIモデルタイプの定義
 *
 * サポートされているOpenAIのモデルを定数として定義し、
 * 型安全性を提供します。
 *
 * @example
 * const model = ModelType.GPT_4O_MINI;
 * if (isValidModel(model)) {
 *   // 有効なモデル
 * }
 */
export const ModelType = {
  /** GPT-3.5 Turbo - 高速でコスト効率の良いモデル */
  GPT_3_5_TURBO: 'gpt-3.5-turbo',
  /** GPT-4 - 高精度な推論が可能なモデル */
  GPT_4: 'gpt-4',
  /** GPT-4o Mini - GPT-4oの軽量版 */
  GPT_4O_MINI: 'gpt-4o-mini',
} as const;

/** 有効なモデルタイプのキー型 */
export type ModelTypeKey = (typeof ModelType)[keyof typeof ModelType];

/** 有効なモデルのリスト */
export const VALID_MODELS = Object.values(ModelType);

/**
 * 指定された文字列が有効なモデルタイプかどうかを判定する
 *
 * @param m - 判定する文字列
 * @returns 有効なモデルタイプの場合true
 * @example
 * isValidModel('gpt-4o-mini') // true
 * isValidModel('invalid-model') // false
 */
export function isValidModel(m: string): m is ModelTypeKey {
  return VALID_MODELS.includes(m as ModelTypeKey);
}
