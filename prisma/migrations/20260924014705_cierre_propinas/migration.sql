-- AlterTable
ALTER TABLE "WorkDay" ALTER COLUMN "totalSales" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "tipsTotal" SET DATA TYPE DECIMAL(14,2);

-- CreateTable
CREATE TABLE "TipShare" (
    "id" TEXT NOT NULL,
    "workDayId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "TipShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TipShare_employeeId_idx" ON "TipShare"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "TipShare_workDayId_employeeId_key" ON "TipShare"("workDayId", "employeeId");

-- AddForeignKey
ALTER TABLE "TipShare" ADD CONSTRAINT "TipShare_workDayId_fkey" FOREIGN KEY ("workDayId") REFERENCES "WorkDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipShare" ADD CONSTRAINT "TipShare_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
