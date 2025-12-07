/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'DEVELOPER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ModStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- CreateTable
CREATE TABLE "Mod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "longDescription" TEXT,
    "version" TEXT NOT NULL,
    "apiVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "mainCode" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Other',
    "tags" TEXT[],
    "iconUrl" TEXT,
    "screenshotUrls" TEXT[],
    "repositoryUrl" TEXT,
    "license" TEXT NOT NULL DEFAULT 'MIT',
    "nodeTypes" JSONB NOT NULL,
    "permissions" TEXT[],
    "checksum" TEXT NOT NULL,
    "signature" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ModStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,

    CONSTRAINT "Mod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "changelog" TEXT,
    "mainCode" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "checksum" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modId" TEXT NOT NULL,

    CONSTRAINT "ModVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModReview" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "modId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ModReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModDownload" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modId" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "ModDownload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "permissions" TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mod_name_key" ON "Mod"("name");

-- CreateIndex
CREATE INDEX "Mod_name_idx" ON "Mod"("name");

-- CreateIndex
CREATE INDEX "Mod_authorId_idx" ON "Mod"("authorId");

-- CreateIndex
CREATE INDEX "Mod_status_idx" ON "Mod"("status");

-- CreateIndex
CREATE INDEX "Mod_category_idx" ON "Mod"("category");

-- CreateIndex
CREATE INDEX "Mod_downloads_idx" ON "Mod"("downloads");

-- CreateIndex
CREATE INDEX "Mod_rating_idx" ON "Mod"("rating");

-- CreateIndex
CREATE INDEX "ModVersion_modId_idx" ON "ModVersion"("modId");

-- CreateIndex
CREATE UNIQUE INDEX "ModVersion_modId_version_key" ON "ModVersion"("modId", "version");

-- CreateIndex
CREATE INDEX "ModReview_modId_idx" ON "ModReview"("modId");

-- CreateIndex
CREATE UNIQUE INDEX "ModReview_modId_userId_key" ON "ModReview"("modId", "userId");

-- CreateIndex
CREATE INDEX "ModDownload_modId_idx" ON "ModDownload"("modId");

-- CreateIndex
CREATE INDEX "ModDownload_createdAt_idx" ON "ModDownload"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Mod" ADD CONSTRAINT "Mod_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModVersion" ADD CONSTRAINT "ModVersion_modId_fkey" FOREIGN KEY ("modId") REFERENCES "Mod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModReview" ADD CONSTRAINT "ModReview_modId_fkey" FOREIGN KEY ("modId") REFERENCES "Mod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModReview" ADD CONSTRAINT "ModReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModDownload" ADD CONSTRAINT "ModDownload_modId_fkey" FOREIGN KEY ("modId") REFERENCES "Mod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModDownload" ADD CONSTRAINT "ModDownload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
