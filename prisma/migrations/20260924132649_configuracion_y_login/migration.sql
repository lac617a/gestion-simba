-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "payWeekStart" INTEGER NOT NULL,
    "closedWeekdays" INTEGER[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginThrottle" (
    "key" TEXT NOT NULL,
    "failures" INTEGER NOT NULL,
    "firstFailureAt" TIMESTAMP(3) NOT NULL,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY ("key")
);
