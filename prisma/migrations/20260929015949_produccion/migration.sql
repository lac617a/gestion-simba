-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "productionPay" DECIMAL(14,2) NOT NULL DEFAULT 50000;

-- CreateTable
CREATE TABLE "ProductionDay" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionAttendance" (
    "id" TEXT NOT NULL,
    "productionDayId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "basePay" DECIMAL(14,2) NOT NULL,
    "extraPay" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "ProductionAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionDay_date_key" ON "ProductionDay"("date");

-- CreateIndex
CREATE INDEX "ProductionAttendance_employeeId_idx" ON "ProductionAttendance"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionAttendance_productionDayId_employeeId_key" ON "ProductionAttendance"("productionDayId", "employeeId");

-- AddForeignKey
ALTER TABLE "ProductionAttendance" ADD CONSTRAINT "ProductionAttendance_productionDayId_fkey" FOREIGN KEY ("productionDayId") REFERENCES "ProductionDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionAttendance" ADD CONSTRAINT "ProductionAttendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
