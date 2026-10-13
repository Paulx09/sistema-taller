/*
  Warnings:

  - A unique constraint covering the columns `[tipo,nombre]` on the table `categorias` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "TipoItem" AS ENUM ('PRODUCTO', 'SERVICIO');

-- DropIndex
DROP INDEX "categorias_nombre_key";

-- AlterTable
ALTER TABLE "categorias" ADD COLUMN     "tipo" "TipoItem" NOT NULL DEFAULT 'PRODUCTO';

-- AlterTable
ALTER TABLE "productos" ADD COLUMN     "tipo" "TipoItem" NOT NULL DEFAULT 'PRODUCTO',
ALTER COLUMN "precio_compra" SET DEFAULT 0,
ALTER COLUMN "stock_minimo" SET DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "categorias_tipo_nombre_key" ON "categorias"("tipo", "nombre");
