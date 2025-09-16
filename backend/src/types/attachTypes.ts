/**
 * Express リクエスト型の合成ユーティリティ
 *
 * ミドルウェアで付与された型を安全に合成し、コントローラで型安全にアクセスできるようにします。
 * 実行順番が変わるミドルウェアは unknown を許容し、実行時に検証しますが、
 * コントローラは型で静的に確認できるようにします。
 *
 * @example
 * // 基本的な使用例
 * type Req = AttachAll<[AuthenticatedRequest, { validatedBody: UpdateUserProfileRequest }]>;
 * const handler = (req: Req, res: Response) => {
 *   // req.validatedBody が型付きで使える
 *   const { name } = req.validatedBody; // 型安全
 * };
 *
 * @example
 * // 厳格モードでの使用例
 * type Req = Attach<AuthenticatedRequest, { id: number }, "strict">; // キー衝突でエラー
 */

/**
 * 型を簡潔に表示するためのヘルパー型
 */
type Simplify<T> = { [K in keyof T]: T[K] } & {};

/**
 * 2つのオブジェクト型を合成する
 *
 * @param A - ベースとなるオブジェクト型
 * @param B - 合成するオブジェクト型
 * @param Mode - 合成モード
 *   - "overwrite"（既定）: 右側で上書き（キー衝突OK）
 *   - "strict": キー衝突が1つでもあれば型エラー（never）
 * @returns 合成された型
 *
 * @example
 * type A = { id: string; createdAt: string };
 * type B = { title: string };
 * type C = Attach<A, B>; // { id: string; createdAt: string; title: string }
 *
 * @example
 * type D = Attach<A, { id: number }, "strict">; // never（id が衝突）
 */
export type Attach<
  A extends object,
  B extends object,
  Mode extends 'overwrite' | 'strict' = 'overwrite',
> = Mode extends 'overwrite'
  ? Simplify<Omit<A, keyof B> & B>
  : Extract<keyof A, keyof B> extends never
    ? Simplify<A & B>
    : never;

/**
 * 複数のオブジェクト型を順次合成する
 *
 * @param T - 合成するオブジェクト型の配列
 * @param Mode - 合成モード
 *   - "overwrite"（既定）: 右側で上書き（キー衝突OK）
 *   - "strict": キー衝突が1つでもあれば型エラー（never）
 * @returns 合成された型
 *
 * @example
 * type A = { id: string; createdAt: string };
 * type B = { title: string };
 * type C = { id: number };
 * type D = AttachAll<[A, B, C]>; // { createdAt: string; title: string; id: number }
 */
export type AttachAll<
  T extends readonly object[],
  Mode extends 'overwrite' | 'strict' = 'overwrite',
> = T extends [infer H extends object, ...infer R extends object[]]
  ? Attach<H, AttachAll<R, Mode>, Mode>
  : Record<string, never>;

/**
 * バリデーション済みリクエストボディの型
 * ミドルウェアでバリデーション後に付与される型
 */
export interface ValidatedBody<T = unknown> {
  validatedBody: T;
}

/**
 * ユーザープロフィール情報の型
 * ミドルウェアでユーザー存在確認後に付与される型
 */
export interface UserProfile {
  userProfile: {
    id: string;
    email: string;
    name: string | null;
    emailVerified: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * ExpressのRequestHandler型との互換性を保つための型アサーション
 * ルーターで使用する際は、この型を使用して型アサーションを行います
 */
export type RequestHandlerWithAttach<T> = (
  req: T,
  res: import('express').Response,
  next?: import('express').NextFunction
) => void | Promise<void>;
