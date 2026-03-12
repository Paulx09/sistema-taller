/*
  Warnings:

  - You are about to drop the column `orden_id` on the `items_orden` table. All the data in the column will be lost.
  - You are about to drop the column `orden_id` on the `notas_tecnicas` table. All the data in the column will be lost.
  - You are about to drop the column `costo_estimado` on the `ordenes_servicio` table. All the data in the column will be lost.
  - You are about to drop the column `diagnostico_inicial` on the `ordenes_servicio` table. All the data in the column will be lost.
  - You are about to drop the column `equipo_id` on the `ordenes_servicio` table. All the data in the column will be lost.
  - You are about to drop the column `observaciones_esteticas` on the `ordenes_servicio` table. All the data in the column will be lost.
  - You are about to drop the column `problema_reportado` on the `ordenes_servicio` table. All the data in the column will be lost.
  - Added the required column `equipo_orden_id` to the `items_orden` table without a default value. This is not possible if the table is not empty.
  - Added the required column `equipo_orden_id` to the `notas_tecnicas` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EstadoEquipoOrden" AS ENUM ('RECIBIDA', 'EN_REPARACION', 'LISTA', 'CANCELADA');

-- DropForeignKey
ALTER TABLE "items_orden" DROP CONSTRAINT "items_orden_orden_id_fkey";

-- DropForeignKey
ALTER TABLE "notas_tecnicas" DROP CONSTRAINT "notas_tecnicas_orden_id_fkey";

-- DropForeignKey
ALTER TABLE "ordenes_servicio" DROP CONSTRAINT "ordenes_servicio_equipo_id_fkey";

-- AlterTable
ALTER TABLE "items_orden" DROP COLUMN "orden_id",
ADD COLUMN     "equipo_orden_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "notas_tecnicas" DROP COLUMN "orden_id",
ADD COLUMN     "equipo_orden_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ordenes_servicio" DROP COLUMN "costo_estimado",
DROP COLUMN "diagnostico_inicial",
DROP COLUMN "equipo_id",
DROP COLUMN "observaciones_esteticas",
DROP COLUMN "problema_reportado";

-- CreateTable
CREATE TABLE "equipos_orden" (
    "id" TEXT NOT NULL,
    "orden_id" TEXT NOT NULL,
    "equipo_id" TEXT NOT NULL,
    "problema_reportado" TEXT NOT NULL,
    "diagnostico_tecnico" TEXT,
    "observaciones_esteticas" JSONB,
    "costo_estimado" DECIMAL(10,2),
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ganancia" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estado" "EstadoEquipoOrden" NOT NULL DEFAULT 'RECIBIDA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipos_orden_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "equipos_orden" ADD CONSTRAINT "equipos_orden_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ordenes_servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos_orden" ADD CONSTRAINT "equipos_orden_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipos_cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_orden" ADD CONSTRAINT "items_orden_equipo_orden_id_fkey" FOREIGN KEY ("equipo_orden_id") REFERENCES "equipos_orden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_tecnicas" ADD CONSTRAINT "notas_tecnicas_equipo_orden_id_fkey" FOREIGN KEY ("equipo_orden_id") REFERENCES "equipos_orden"("id") ON DELETE CASCADE ON UPDATE CASCADE;
