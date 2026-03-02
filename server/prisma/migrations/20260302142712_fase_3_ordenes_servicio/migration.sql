-- CreateEnum
CREATE TYPE "EstadoOrden" AS ENUM ('RECIBIDA', 'EN_REPARACION', 'LISTA', 'ENTREGADA', 'CANCELADA');

-- AlterTable
ALTER TABLE "movimientos_stock" ADD COLUMN     "orden_servicio_id" TEXT;

-- AlterTable
ALTER TABLE "ventas" ADD COLUMN     "cliente_id" TEXT;

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "dni_ruc" VARCHAR(11),
    "telefono" VARCHAR(20),
    "direccion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipos_cliente" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "tipo_equipo" VARCHAR(50) NOT NULL,
    "marca" VARCHAR(50),
    "modelo" VARCHAR(50),
    "numero_serie" VARCHAR(100),
    "contrasena_patron" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipos_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes_servicio" (
    "id" TEXT NOT NULL,
    "codigo_correlativo" SERIAL NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "equipo_id" TEXT NOT NULL,
    "usuario_registro_id" TEXT NOT NULL,
    "usuario_tecnico_id" TEXT,
    "fecha_emision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "problema_reportado" TEXT NOT NULL,
    "diagnostico_inicial" TEXT,
    "observaciones_esteticas" JSONB,
    "costo_estimado" DECIMAL(10,2),
    "pago_a_cuenta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ganancia_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estado" "EstadoOrden" NOT NULL DEFAULT 'RECIBIDA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ordenes_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items_orden" (
    "id" TEXT NOT NULL,
    "orden_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(10,2) NOT NULL,
    "costo_unitario_snapshot" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_orden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas_tecnicas" (
    "id" TEXT NOT NULL,
    "orden_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notas_tecnicas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_dni_ruc_key" ON "clientes"("dni_ruc");

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_orden_servicio_id_fkey" FOREIGN KEY ("orden_servicio_id") REFERENCES "ordenes_servicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos_cliente" ADD CONSTRAINT "equipos_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_servicio" ADD CONSTRAINT "ordenes_servicio_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_servicio" ADD CONSTRAINT "ordenes_servicio_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipos_cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_servicio" ADD CONSTRAINT "ordenes_servicio_usuario_registro_id_fkey" FOREIGN KEY ("usuario_registro_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_servicio" ADD CONSTRAINT "ordenes_servicio_usuario_tecnico_id_fkey" FOREIGN KEY ("usuario_tecnico_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_orden" ADD CONSTRAINT "items_orden_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ordenes_servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_orden" ADD CONSTRAINT "items_orden_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_tecnicas" ADD CONSTRAINT "notas_tecnicas_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ordenes_servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_tecnicas" ADD CONSTRAINT "notas_tecnicas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
