import nodemailer from 'nodemailer';
import { nodemailerConfig, emailConfig, EmailTemplate } from '../config/nodemailer';

/**
 * メール送信用のトランスポーターを作成する
 * @returns Nodemailerトランスポーター
 * @throws Error トランスポーター作成に失敗した場合
 * @example
 * const transporter = createEmailTransporter();
 */
export function createEmailTransporter(): nodemailer.Transporter {
  try {
    return nodemailer.createTransport({
      host: nodemailerConfig.host,
      port: nodemailerConfig.port,
      secure: nodemailerConfig.secure,
      auth: nodemailerConfig.auth,
    });
  } catch (error) {
    throw new Error(`Email transporter creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * メールを送信する
 * @param to 送信先メールアドレス
 * @param subject 件名
 * @param html HTML本文
 * @param text テキスト本文（オプション）
 * @returns 送信結果
 * @throws Error メール送信に失敗した場合
 * @example
 * await sendEmail('user@example.com', 'Welcome', '<h1>Welcome!</h1>', 'Welcome!');
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<nodemailer.SentMessageInfo> {
  const transporter = createEmailTransporter();
  
  try {
    const result = await transporter.sendMail({
      from: `${nodemailerConfig.from.name} <${nodemailerConfig.from.address}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // HTMLタグを除去してテキスト版を生成
    });
    
    return result;
  } catch (error) {
    throw new Error(`Email sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * メールテンプレートを使用してメールを送信する
 * @param to 送信先メールアドレス
 * @param template メールテンプレート
 * @returns 送信結果
 * @throws Error メール送信に失敗した場合
 * @example
 * await sendEmailWithTemplate('user@example.com', welcomeTemplate);
 */
export async function sendEmailWithTemplate(
  to: string,
  template: EmailTemplate
): Promise<nodemailer.SentMessageInfo> {
  return sendEmail(to, template.subject, template.html, template.text);
}

/**
 * アカウント確認メールのテンプレートを生成する
 * @param userName ユーザー名
 * @param verificationUrl 確認URL
 * @returns メールテンプレート
 * @example
 * const template = createVerificationEmailTemplate('John Doe', 'https://example.com/verify?token=abc123');
 */
export function createVerificationEmailTemplate(
  userName: string,
  verificationUrl: string
): EmailTemplate {
  const subject = 'アカウント確認のお願い';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>アカウント確認のお願い</h2>
      <p>こんにちは、${userName}さん</p>
      <p>アカウントの確認をお願いいたします。以下のリンクをクリックしてアカウントを有効化してください。</p>
      <p style="margin: 20px 0;">
        <a href="${verificationUrl}" 
           style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          アカウントを確認する
        </a>
      </p>
      <p>このリンクは${emailConfig.verificationExpiresIn}分間有効です。</p>
      <p>もしこのメールに心当たりがない場合は、このメールを無視してください。</p>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px;">
        Trip Shiori チーム
      </p>
    </div>
  `;
  
  const text = `
アカウント確認のお願い

こんにちは、${userName}さん

アカウントの確認をお願いいたします。以下のリンクをクリックしてアカウントを有効化してください。

${verificationUrl}

このリンクは${emailConfig.verificationExpiresIn}分間有効です。

もしこのメールに心当たりがない場合は、このメールを無視してください。

---
Trip Shiori チーム
  `;
  
  return { subject, html, text };
}

/**
 * パスワードリセットメールのテンプレートを生成する
 * @param userName ユーザー名
 * @param resetUrl リセットURL
 * @returns メールテンプレート
 * @example
 * const template = createPasswordResetEmailTemplate('John Doe', 'https://example.com/reset?token=abc123');
 */
export function createPasswordResetEmailTemplate(
  userName: string,
  resetUrl: string
): EmailTemplate {
  const subject = 'パスワードリセットのお願い';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>パスワードリセットのお願い</h2>
      <p>こんにちは、${userName}さん</p>
      <p>パスワードリセットのリクエストを受け付けました。以下のリンクをクリックして新しいパスワードを設定してください。</p>
      <p style="margin: 20px 0;">
        <a href="${resetUrl}" 
           style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          パスワードをリセットする
        </a>
      </p>
      <p>このリンクは${emailConfig.passwordResetExpiresIn}分間有効です。</p>
      <p>もしこのリクエストを送信していない場合は、このメールを無視してください。</p>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px;">
        Trip Shiori チーム
      </p>
    </div>
  `;
  
  const text = `
パスワードリセットのお願い

こんにちは、${userName}さん

パスワードリセットのリクエストを受け付けました。以下のリンクをクリックして新しいパスワードを設定してください。

${resetUrl}

このリンクは${emailConfig.passwordResetExpiresIn}分間有効です。

もしこのリクエストを送信していない場合は、このメールを無視してください。

---
Trip Shiori チーム
  `;
  
  return { subject, html, text };
}
