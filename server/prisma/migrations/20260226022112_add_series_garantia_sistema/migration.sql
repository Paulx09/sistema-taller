-- CreateEnum
CREATE TYPE "EstadoSerie" AS ENUM ('DISPONIBLE', 'VENDIDO', 'GARANTIA', 'DEVUELTO');

-- AlterTable
ALTER TABLE "productos" ADD COLUMN     "garantia_cliente_meses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "garantia_proveedor_meses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "requiere_serie" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "producto_series" (
    "id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "numero_serie" VARCHAR(100) NOT NULL,
    "estado" "EstadoSerie" NOT NULL DEFAULT 'DISPONIBLE',
    "compra_id" TEXT,
    "venta_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "producto_series_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "producto_series_numero_serie_key" ON "producto_series"("numero_serie");

-- CreateIndex
CREATE INDEX "producto_series_producto_id_idx" ON "producto_series"("producto_id");

-- CreateIndex
CREATE INDEX "producto_series_estado_idx" ON "producto_series"("estado");

-- CreateIndex
CREATE INDEX "producto_series_numero_serie_idx" ON "producto_series"("numero_serie");

-- AddForeignKey
ALTER TABLE "producto_series" ADD CONSTRAINT "producto_series_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_series" ADD CONSTRAINT "producto_series_compra_id_fkey" FOREIGN KEY ("compra_id") REFERENCES "compras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_series" ADD CONSTRAINT "producto_series_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
