import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Zodスキーマを使用したリクエストバリデーションミドルウェア
 * 
 * @param schema - バリデーションに使用するZodスキーマ
 * @param target - バリデーション対象（'body' | 'query' | 'params'）
 * @returns Expressミドルウェア関数
 */
export const validateRequest = <T>(
  schema: ZodSchema<T>,
  target: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = req[target];
      const validatedData = schema.parse(data);
      
      // バリデーション済みデータをリクエストオブジェクトに設定
      (req as any)[`validated${target.charAt(0).toUpperCase() + target.slice(1)}`] = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        const errorCode = target === 'body' ? 'invalid_body' : 
                          target === 'query' ? 'invalid_query' : 
                          'invalid_params';
        
        res.status(400).json({
          error: errorCode,
          message: 'Request validation failed',
          details: errorMessages,
        });
        return;
      }

      // その他のエラー
      console.error('Validation middleware error:', error);
      res.status(500).json({
        error: 'internal_server_error',
        message: 'Validation failed due to server error',
      });
    }
  };
};

/**
 * リクエストボディのバリデーション用ヘルパー
 */
export const validateBody = <T>(schema: ZodSchema<T>) => validateRequest(schema, 'body');

/**
 * クエリパラメータのバリデーション用ヘルパー
 */
export const validateQuery = <T>(schema: ZodSchema<T>) => validateRequest(schema, 'query');

/**
 * パスパラメータのバリデーション用ヘルパー
 */
export const validateParams = <T>(schema: ZodSchema<T>) => validateRequest(schema, 'params');
