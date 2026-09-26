-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "openingHours" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "payDay" INTEGER NOT NULL DEFAULT 1;
