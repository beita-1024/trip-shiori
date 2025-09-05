/**
 * Nodemailer設定
 */
export const nodemailerConfig = {
  /** SMTPホスト */
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  
  /** SMTPポート */
  port: parseInt(process.env.SMTP_PORT || '587'),
  
  /** セキュア接続 */
  secure: process.env.SMTP_SECURE === 'true',
  
  /** 認証情報 */
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  
  /** 送信者情報 */
  from: {
    name: process.env.SMTP_FROM_NAME || 'Trip Shiori',
    address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '',
  },
} as const;

/**
 * メール送信の設定
 */
export const emailConfig = {
  /** 確認メールの有効期限（分） */
  verificationExpiresIn: 30,
  
  /** パスワードリセットメールの有効期限（分） */
  passwordResetExpiresIn: 15,
  
  /** メール送信のレート制限（1時間あたりの送信数） */
  rateLimitPerHour: 10,
} as const;

/**
 * メールテンプレートの型定義
 */
export interface EmailTemplate {
  /** 件名 */
  subject: string;
  
  /** HTML本文 */
  html: string;
  
  /** テキスト本文 */
  text: string;
}
