/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `fcm_tokens` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_confirmed" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "fcm_tokens_token_key" ON "fcm_tokens"("token");
