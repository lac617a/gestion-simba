-- CreateEnum
CREATE TYPE "WorkShift" AS ENUM ('MORNING', 'EVENING', 'BOTH');

-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "doubleShiftWeekdays" INTEGER[] DEFAULT ARRAY[0, 6]::INTEGER[],
ADD COLUMN     "shiftHours" TEXT[] DEFAULT ARRAY['11:00-16:00', '17:30-23:30']::TEXT[];

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "shift" "WorkShift";

-- AlterTable
ALTER TABLE "WorkDay" ADD COLUMN     "doubleShift" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "morningClosedAt" TIMESTAMP(3),
ADD COLUMN     "tipsEvening" DECIMAL(14,2),
ADD COLUMN     "tipsMorning" DECIMAL(14,2);
