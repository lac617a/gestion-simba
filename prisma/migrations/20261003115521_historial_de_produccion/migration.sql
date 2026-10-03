-- CreateEnum
CREATE TYPE "ProductionLogAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED');

-- CreateTable
CREATE TABLE "ProductionLog" (
    "id" TEXT NOT NULL,
    "productionDayId" TEXT,
    "userId" TEXT,
    "action" "ProductionLogAction" NOT NULL,
    "date" DATE NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductionLog_productionDayId_createdAt_idx" ON "ProductionLog"("productionDayId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductionLog_createdAt_idx" ON "ProductionLog"("createdAt");

-- AddForeignKey
ALTER TABLE "ProductionLog" ADD CONSTRAINT "ProductionLog_productionDayId_fkey" FOREIGN KEY ("productionDayId") REFERENCES "ProductionDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLog" ADD CONSTRAINT "ProductionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Las jornadas ya registradas entran al historial como "registradas antes del historial" (sin quién ni detalle)
INSERT INTO "ProductionLog" ("id", "productionDayId", "action", "date", "createdAt")
SELECT 'creada-' || "id", "id", 'CREATED'::"ProductionLogAction", "date", "createdAt" FROM "ProductionDay";
