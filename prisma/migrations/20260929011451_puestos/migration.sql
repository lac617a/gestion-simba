-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "jobPositionId" TEXT;

-- CreateTable
CREATE TABLE "JobPosition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dailyPay" DECIMAL(14,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPosition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobPosition_name_key" ON "JobPosition"("name");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_jobPositionId_fkey" FOREIGN KEY ("jobPositionId") REFERENCES "JobPosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Puestos iniciales (2026-09-28). El pago diario está en pesos.
INSERT INTO "JobPosition" ("id", "name", "dailyPay", "sortOrder", "updatedAt") VALUES
  ('cocinero', 'Cocinero', 80000, 1, CURRENT_TIMESTAMP),
  ('mesero', 'Mesero', 60000, 2, CURRENT_TIMESTAMP),
  ('cajero', 'Cajero', 80000, 3, CURRENT_TIMESTAMP),
  ('jefe-de-mesa', 'Jefe de mesa', 70000, 4, CURRENT_TIMESTAMP),
  ('bartender', 'Bartender', 80000, 5, CURRENT_TIMESTAMP);

-- Asigna el puesto a los empleados que ya lo tenían escrito como texto.
UPDATE "Employee" SET "jobPositionId" = CASE
    WHEN lower(trim("position")) IN ('cocinero', 'cocinera', 'cocina') THEN 'cocinero'
    WHEN lower(trim("position")) IN ('mesero', 'mesera', 'meseros') THEN 'mesero'
    WHEN lower(trim("position")) IN ('cajero', 'cajera', 'caja') THEN 'cajero'
    WHEN lower(trim("position")) IN ('jefe de mesa', 'jefa de mesa', 'jefe de meseros') THEN 'jefe-de-mesa'
    WHEN lower(trim("position")) IN ('bartender', 'barman', 'bar tender', 'bar') THEN 'bartender'
  END
WHERE "position" IS NOT NULL;
