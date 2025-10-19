-- 重複インデックスを削除
DROP INDEX IF EXISTS "public"."RefreshToken_tokenHash_idx";

-- fingerprint列を追加
ALTER TABLE "public"."RefreshToken" ADD COLUMN "fingerprint" VARCHAR(64);

-- 既存データに仮のfingerprintを設定（既存トークンは全て失効させる想定）
UPDATE "public"."RefreshToken" SET "isRevoked" = true WHERE "fingerprint" IS NULL;

-- UNIQUE制約を追加（既存の有効トークンがない前提）
ALTER TABLE "public"."RefreshToken" ALTER COLUMN "fingerprint" SET NOT NULL;
CREATE UNIQUE INDEX "RefreshToken_fingerprint_key" ON "public"."RefreshToken"("fingerprint");
