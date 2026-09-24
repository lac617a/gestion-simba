-- CreateTable
CREATE TABLE "DayOverride" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "open" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DayOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DayOverride_date_key" ON "DayOverride"("date");
