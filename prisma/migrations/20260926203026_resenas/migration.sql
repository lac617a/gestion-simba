-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "googleRating" DOUBLE PRECISION NOT NULL DEFAULT 4.6,
ADD COLUMN     "googleReviewCount" INTEGER NOT NULL DEFAULT 243;

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "reviewedAt" DATE NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);


-- Reseñas iniciales (copiadas de Google el 2026-09-26; nombres abreviados)
INSERT INTO "Review" ("id", "author", "rating", "text", "reviewedAt", "position", "updatedAt") VALUES
  ('seed-review-1', 'Anderson R.', 5, '¡La mejor burger de la zona! Carne jugosa, término perfecto y un pan brioche que es pura mantequilla. Las papas rústicas están de otro mundo. Servicio veloz y ambiente de 10. Si buscas felicidad entre dos panes, este es el lugar. ¡Repetiré seguro! 🍔🔥', '2026-03-26', 1, CURRENT_TIMESTAMP),
  ('seed-review-2', 'Andrés C.', 5, 'Sin duda las mejores hamburguesas de Piedecuesta Santander, creo sin dudar que son las sabrosas, he comido en otro lugares y no se compara, el ambiente es muy bonito', '2026-09-19', 2, CURRENT_TIMESTAMP),
  ('seed-review-3', 'José B.', 5, 'Pase a conocer el lugar por recomendación, me gusto, buenas opciones de hamburguesas, buen sabor, buen precio, lugar familiar, buen ambiente. Lo recomiendo.', '2026-01-26', 3, CURRENT_TIMESTAMP),
  ('seed-review-4', 'Paito U.', 5, 'El lugar perfecto para celebrar el cumpleaños o comer la mejores papas locas o hamburguesas etc... De verdad tenéis que venir a Simba unos de los mejores sitios de piedecuesta', '2026-01-26', 4, CURRENT_TIMESTAMP),
  ('seed-review-5', 'Sergio T.', 5, 'La comida es muy buena. El ambiente es agradable y familiar. Música de fondo para compartir una buena conversación. Bebidas en su punto.', '2025-09-26', 5, CURRENT_TIMESTAMP),
  ('seed-review-6', 'Héctor S.', 5, 'Excelente ambiente y la comida muy rica, precios razonables y la atención es buena.', '2026-01-26', 6, CURRENT_TIMESTAMP),
  ('seed-review-7', 'Mónica O.', 5, 'Lo mas rico super delicioso todos servicio al cliente 1000 de 10 todo super', '2026-08-26', 7, CURRENT_TIMESTAMP),
  ('seed-review-8', 'Diana M.', 4, 'Buen lugar, excelente atención y precios cómodos', '2026-03-26', 8, CURRENT_TIMESTAMP);
