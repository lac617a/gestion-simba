-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "calendarEmail" TEXT NOT NULL DEFAULT 'simbaparrilla1@gmail.com';

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "calendarHash" TEXT,
ADD COLUMN     "calendarSequence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "calendarTo" TEXT;
