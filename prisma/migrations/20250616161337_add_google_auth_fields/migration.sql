/*
  Warnings:

  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "password",
ADD COLUMN     "hashed_password" TEXT,
ADD COLUMN     "photo_url" TEXT,
ADD COLUMN     "provider" TEXT DEFAULT 'email';
