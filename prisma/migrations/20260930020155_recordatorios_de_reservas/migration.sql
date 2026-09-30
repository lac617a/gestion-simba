-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "reminderEmail" TEXT NOT NULL DEFAULT 'simbaparrilla1@gmail.com';

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "reminderAt" TIMESTAMP(3),
ADD COLUMN     "reminderEmailId" TEXT;
