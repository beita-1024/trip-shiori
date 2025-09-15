import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

/**
 * サンプルユーザーデータ
 * 開発・テスト用の初期データを定義
 * 
 * パスワードは複雑なものに設定（大文字・小文字・数字・記号を含む）
 * 実際の本番環境では、より強固なパスワードポリシーを適用してください
 */
const sampleUsers = [
  {
    email: 'demo1@example.com',
    password: '53cur3P@55l337!@#',
    name: 'デモユーザー1',
  },
  {
    email: 'demo2@example.com',
    password: 'C0mp1ExPwD$987',
    name: 'デモユーザー2',
  },
  {
    email: 'demo3@example.com',
    password: '57r0ng4u7h&456',
    name: 'デモユーザー3',
  },
  {
    email: 'demo4@example.com',
    password: 'D3m04L0g1n*321',
    name: 'デモユーザー4',
  },
  {
    email: 'demo5@example.com',
    password: 'D3m0*L0g1n+789',
    name: 'デモユーザー5',
  },
];

/**
 * データベースにサンプルユーザーを投入する
 * 既存のユーザーはスキップし、新規ユーザーのみ作成
 */
async function seedUsers(): Promise<void> {
  console.log('サンプルユーザーの作成を開始...');

  for (const userData of sampleUsers) {
    try {
      // 既存ユーザーの確認
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        console.log(`ユーザー ${userData.email} は既に存在します`);
        continue;
      }

      // パスワードをハッシュ化
      const passwordHash = await hashPassword(userData.password);

      // ユーザーを作成
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          passwordHash,
          name: userData.name,
          emailVerified: new Date(), // 開発用に認証済みとして設定
        },
      });

      console.log(`ユーザー作成完了: ${user.email} (ID: ${user.id})`);
    } catch (error) {
      console.error(`ユーザー作成エラー (${userData.email}):`, error);
    }
  }

  console.log('サンプルユーザーの作成が完了しました');
}

/**
 * メインのseed処理
 */
async function main(): Promise<void> {
  try {
    console.log('データベースシード処理を開始...');
    
    await seedUsers();
    
    console.log('シード処理が正常に完了しました');
  } catch (error) {
    console.error('シード処理でエラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 直接実行
main().catch((error) => {
  console.error(error);
  process.exit(1);
});

export { main as seed };
