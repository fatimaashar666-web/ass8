-- CreateEnum
CREATE TYPE "IssueCategory" AS ENUM ('COMPUTER', 'PROJECTOR', 'FAN', 'LIGHT', 'WIFI');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED');

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "ticketCode" TEXT NOT NULL,
    "category" "IssueCategory" NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "building" VARCHAR(120) NOT NULL,
    "room" VARCHAR(60) NOT NULL,
    "reporterName" VARCHAR(120) NOT NULL,
    "reporterEmail" VARCHAR(254) NOT NULL,
    "imageData" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Issue_ticketCode_key" ON "Issue"("ticketCode");

-- CreateIndex
CREATE INDEX "Issue_status_createdAt_idx" ON "Issue"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Issue_category_createdAt_idx" ON "Issue"("category", "createdAt");
