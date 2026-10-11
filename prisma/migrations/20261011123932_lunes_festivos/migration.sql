-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "payHolidaysOff" TEXT[] DEFAULT ARRAY[]::TEXT[];
