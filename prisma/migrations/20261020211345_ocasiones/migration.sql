-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "occasions" TEXT[] DEFAULT ARRAY['Cumpleaños', 'Aniversario', 'Grado', 'Primera comunión', 'Despedida', 'Reunión de trabajo', 'Pedida de mano']::TEXT[];
