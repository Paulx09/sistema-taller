/*
  Warnings:

  - A unique constraint covering the columns `[anio_correlativo,codigo_correlativo]` on the table `ordenes_servicio` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[anio_correlativo,codigo_correlativo]` on the table `ventas` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `anio_correlativo` to the `ordenes_servicio` table without a default value. This is not possible if the table is not empty.
  - Added the required column `anio_correlativo` to the `ventas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ordenes_servicio" ADD COLUMN     "anio_correlativo" INTEGER NOT NULL,
ALTER COLUMN "codigo_correlativo" DROP DEFAULT;
DROP SEQUENCE "ordenes_servicio_codigo_correlativo_seq";

-- AlterTable
ALTER TABLE "ventas" ADD COLUMN     "anio_correlativo" INTEGER NOT NULL,
ALTER COLUMN "codigo_correlativo" DROP DEFAULT;
DROP SEQUENCE "ventas_codigo_correlativo_seq";

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_servicio_anio_correlativo_codigo_correlativo_key" ON "ordenes_servicio"("anio_correlativo", "codigo_correlativo");

-- CreateIndex
CREATE UNIQUE INDEX "ventas_anio_correlativo_codigo_correlativo_key" ON "ventas"("anio_correlativo", "codigo_correlativo");
