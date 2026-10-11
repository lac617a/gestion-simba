-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "backupEmail" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lastBackupAt" TIMESTAMP(3);
