/*
  Warnings:

  - The values [SUBMITTED,REFUNDED] on the enum `JobStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `credit_cost` on the `media_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `input_params` on the `media_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `provider_id` on the `media_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `retry_count` on the `media_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `submitted_at` on the `media_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `api_keys` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `credit_transactions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `orders` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[provider_job_id]` on the table `media_jobs` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `provider` to the `media_jobs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `media_jobs` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `media_jobs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('TEXT_TO_VIDEO', 'IMAGE_TO_VIDEO', 'TEXT_TO_IMAGE', 'IMAGE_UPSCALE');

-- CreateEnum
CREATE TYPE "AIProvider" AS ENUM ('KLING', 'RUNWAY', 'VEO', 'STABILITY', 'OPENAI');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('QRIS', 'VA', 'EWALLET', 'CRYPTO');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('XENDIT', 'MIDTRANS', 'MANUAL');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "LedgerReason" AS ENUM ('TOPUP', 'GENERATE_VIDEO', 'GENERATE_IMAGE', 'REFUND', 'ADMIN_ADJUSTMENT', 'BONUS');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('IDR', 'USD');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('PAYMENT', 'MEDIA_JOB', 'MANUAL', 'BONUS');

-- AlterEnum
BEGIN;
CREATE TYPE "JobStatus_new" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
ALTER TABLE "public"."media_jobs" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "media_jobs" ALTER COLUMN "status" TYPE "JobStatus_new" USING ("status"::text::"JobStatus_new");
ALTER TYPE "JobStatus" RENAME TO "JobStatus_old";
ALTER TYPE "JobStatus_new" RENAME TO "JobStatus";
DROP TYPE "public"."JobStatus_old";
ALTER TABLE "media_jobs" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "credit_transactions" DROP CONSTRAINT "credit_transactions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_user_id_fkey";

-- AlterTable
ALTER TABLE "media_jobs" DROP COLUMN "credit_cost",
DROP COLUMN "input_params",
DROP COLUMN "provider_id",
DROP COLUMN "retry_count",
DROP COLUMN "submitted_at",
ADD COLUMN     "cost_currency" "Currency" NOT NULL DEFAULT 'USD',
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "provider" "AIProvider" NOT NULL,
ADD COLUMN     "provider_cost" DECIMAL(10,4) DEFAULT 0,
ADD COLUMN     "result_url" TEXT,
ADD COLUMN     "started_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "JobType" NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "status",
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "language_code" TEXT,
ADD COLUMN     "last_name" TEXT,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- DropTable
DROP TABLE "api_keys";

-- DropTable
DROP TABLE "credit_transactions";

-- DropTable
DROP TABLE "orders";

-- DropEnum
DROP TYPE "OrderStatus";

-- DropEnum
DROP TYPE "TransactionType";

-- DropEnum
DROP TYPE "UserStatus";

-- CreateTable
CREATE TABLE "credit_ledgers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_before" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "type" "LedgerType" NOT NULL,
    "reason" "LedgerReason" NOT NULL,
    "note" TEXT,
    "reference_type" "ReferenceType" NOT NULL,
    "reference_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'IDR',
    "credits_purchased" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "payment_provider" "PaymentProvider" NOT NULL,
    "external_reference" TEXT,
    "paid_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_ledgers_user_id_idx" ON "credit_ledgers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_external_reference_key" ON "payment_transactions"("external_reference");

-- CreateIndex
CREATE INDEX "payment_transactions_user_id_status_idx" ON "payment_transactions"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "media_jobs_provider_job_id_key" ON "media_jobs"("provider_job_id");

-- CreateIndex
CREATE INDEX "media_jobs_user_id_status_created_at_idx" ON "media_jobs"("user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "users_telegram_id_idx" ON "users"("telegram_id");

-- AddForeignKey
ALTER TABLE "credit_ledgers" ADD CONSTRAINT "credit_ledgers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
