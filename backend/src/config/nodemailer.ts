/**
 * Nodemailer設定
 */

// 本番環境ではSMTP_USERおよびSMTP_PASSの設定が必須です。
const rawPort = (process.env.SMTP_PORT ?? '').trim();
const parsedPort = Number.parseInt(rawPort, 10);
const port = Number.isNaN(parsedPort) ? 587 : parsedPort;
const secure = process.env.SMTP_SECURE === 'true' || port === 465;
if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.SMTP_USER || !process.env.SMTP_PASS)
) {
  throw new Error('SMTP_USER and SMTP_PASS must be set in production');
}

export const nodemailerConfig = {
  /** SMTPホスト */
  host: process.env.SMTP_HOST || 'smtp.gmail.com',

  /** SMTPポート */
  port,

  /** セキュア接続 */
  secure,

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
