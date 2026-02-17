/*
  Warnings:

  - Changed the type of `tipo` on the `MovimientoStock` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE', 'INVENTARIO_INICIAL');

-- AlterTable
ALTER TABLE "MovimientoStock" ADD COLUMN     "usuarioId" INTEGER,
DROP COLUMN "tipo",
ADD COLUMN     "tipo" "TipoMovimiento" NOT NULL;

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "esServicio" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
