import prisma from '../config/database';
import { Prisma } from '@prisma/client';

interface DetalleCompraInput {
  productoId: string;
  cantidad: number;
  costoUnitario: number;
  numerosSerie?: string[]; // FASE 3: Números de serie para productos que lo requieren
}

interface CrearCompraData {
  proveedorId: string;
  numeroFactura: string;
  fechaCompra?: Date;
  detalles: DetalleCompraInput[];
  usuarioId: string;
}

interface FiltrosCompra {
  proveedorId?: string;
  desde?: Date;
  hasta?: Date;
  skip?: number;
  take?: number;
}

class CompraService {
  // GET /api/compras - Lista con filtros
  async listar(filtros: FiltrosCompra = {}) {
    const { proveedorId, desde, hasta, skip = 0, take = 50 } = filtros;

    const where: Prisma.CompraWhereInput = {
      deletedAt: null,
      ...(proveedorId ? { proveedorId } : {}),
      ...(desde || hasta
        ? {
            fechaCompra: {
              ...(desde ? { gte: desde } : {}),
              ...(hasta ? { lt: hasta } : {}),
            },
          }
        : {}),
    };

    const [compras, total] = await Promise.all([
      prisma.compra.findMany({
        where,
        skip,
        take,
        orderBy: { fechaCompra: 'desc' },
        include: {
          proveedor: {
            select: {
              id: true,
              nombreEmpresa: true,
              ruc: true,
            },
          },
          usuario: {
            select: {
              id: true,
              username: true,
              nombreCompleto: true,
            },
          },
          detalles: {
            include: {
              producto: {
                select: {
                  id: true,
                  nombre: true,
                  marca: true,
                  modelo: true,
                },
              },
            },
          },
          _count: {
            select: { detalles: true },
          },
        },
      }),
      prisma.compra.count({ where }),
    ]);

    return { compras, total };
  }

  // GET /api/compras/:id
  async obtenerPorId(id: string) {
    const compra = await prisma.compra.findFirst({
      where: { id, deletedAt: null },
      include: {
        proveedor: {
          select: {
            id: true,
            nombreEmpresa: true,
            ruc: true,
            contactoNombre: true,
            telefono: true,
          },
        },
        usuario: {
          select: {
            id: true,
            username: true,
            nombreCompleto: true,
          },
        },
        detalles: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                marca: true,
                modelo: true,
                sku: true,
                esServicio: true,
                categoria: { select: { nombre: true } },
              },
            },
          },
        },
      },
    });

    if (!compra) {
      throw new Error('Compra no encontrada');
    }

    return compra;
  }

  // POST /api/compras - Crear compra con lógica completa
  async crear(data: CrearCompraData) {
    const { proveedorId, numeroFactura, fechaCompra, detalles, usuarioId } = data;

    // 1. Validaciones previas
    if (!detalles || detalles.length === 0) {
      throw new Error('La compra debe tener al menos un producto');
    }

    // Validar que todos los productos existan
    for (const detalle of detalles) {
      if (detalle.cantidad <= 0) {
        throw new Error('La cantidad debe ser mayor a 0');
      }
      if (detalle.costoUnitario <= 0) {
        throw new Error('El costo unitario debe ser mayor a 0');
      }

      const producto = await prisma.producto.findFirst({
        where: { id: detalle.productoId, deletedAt: null },
      });

      if (!producto) {
        throw new Error(`Producto no encontrado: ${detalle.productoId}`);
      }
    }

    // 2. Transacción ACID
    const compra = await prisma.$transaction(async (tx) => {
      // Calcular total de la compra
      let totalCompra = new Prisma.Decimal(0);
      for (const detalle of detalles) {
        const subtotal = new Prisma.Decimal(detalle.costoUnitario).mul(detalle.cantidad);
        totalCompra = totalCompra.add(subtotal);
      }

      // 2a. Crear la Compra (constraint único validará duplicados)
      const nuevaCompra = await tx.compra.create({
        data: {
          proveedorId,
          usuarioId,
          numeroFactura,
          fechaCompra: fechaCompra || new Date(),
          totalCompra,
        },
      });

      // 2b. Procesar cada detalle
      for (const detalle of detalles) {
        const subtotal = new Prisma.Decimal(detalle.costoUnitario).mul(detalle.cantidad);

        // Obtener producto actual
        const productoActual = await tx.producto.findUniqueOrThrow({
          where: { id: detalle.productoId },
          select: {
            id: true,
            nombre: true,
            esServicio: true,
            stockActual: true,
            precioCompra: true,
          },
        });

        // Crear DetalleCompra
        await tx.detalleCompra.create({
          data: {
            compraId: nuevaCompra.id,
            productoId: detalle.productoId,
            cantidad: detalle.cantidad,
            costoUnitario: new Prisma.Decimal(detalle.costoUnitario),
            subtotal,
          },
        });

        // Solo para productos físicos (no servicios)
        if (!productoActual.esServicio) {
          // i. Incrementar stock
          await tx.producto.update({
            where: { id: detalle.productoId },
            data: {
              stockActual: { increment: detalle.cantidad },
            },
          });

          // ii. Crear MovimientoStock tipo ENTRADA con referencia a compra
          await tx.movimientoStock.create({
            data: {
              productoId: detalle.productoId,
              usuarioId,
              tipo: 'ENTRADA',
              cantidad: detalle.cantidad,
              motivo: `Compra - Factura ${numeroFactura}`,
              compraId: nuevaCompra.id,
            },
          });
        }

        // iii. Actualizar precio_compra con promedio ponderado
        // Promedio = (stockAnterior * precioAnterior + cantidadNueva * costoNuevo) / stockTotal
        const stockAnterior = productoActual.stockActual;
        const precioAnterior = productoActual.precioCompra;
        const cantidadNueva = detalle.cantidad;
        const costoNuevo = new Prisma.Decimal(detalle.costoUnitario);
        const stockTotal = stockAnterior + cantidadNueva;

        // Si es el primer ingreso (stock era 0), usar directamente el nuevo costo
        const nuevoPrecioCompra =
          stockAnterior === 0
            ? costoNuevo
            : new Prisma.Decimal(precioAnterior)
                .mul(stockAnterior)
                .add(costoNuevo.mul(cantidadNueva))
                .div(stockTotal);

        await tx.producto.update({
          where: { id: detalle.productoId },
          data: {
            precioCompra: nuevoPrecioCompra,
          },
        });

        // iv. Registrar en HistorialCosto (trazabilidad total)
        await tx.historialCosto.create({
          data: {
            productoId: detalle.productoId,
            costo: costoNuevo,
            fechaRegistro: fechaCompra || new Date(),
          },
        });

        // v. FASE 3: Registrar números de serie si el producto lo requiere
        if (detalle.numerosSerie && detalle.numerosSerie.length > 0) {
          // Validar que la cantidad de series coincida con la cantidad comprada
          if (detalle.numerosSerie.length !== detalle.cantidad) {
            throw new Error(
              `El producto ${productoActual.nombre} requiere ${detalle.cantidad} número(s) de serie, pero se proporcionaron ${detalle.numerosSerie.length}`
            );
          }

          // Validar duplicados en el array
          const duplicados = detalle.numerosSerie.filter(
            (item, index) => detalle.numerosSerie!.indexOf(item) !== index
          );
          if (duplicados.length > 0) {
            throw new Error(
              `Números de serie duplicados: ${duplicados.join(', ')}`
            );
          }

          // Validar que no existan en la BD
          const existentes = await tx.productoSerie.findMany({
            where: {
              numeroSerie: { in: detalle.numerosSerie },
            },
            select: { numeroSerie: true },
          });

          if (existentes.length > 0) {
            throw new Error(
              `Los siguientes números de serie ya existen: ${existentes.map((s) => s.numeroSerie).join(', ')}`
            );
          }

          // Registrar cada número de serie
          await tx.productoSerie.createMany({
            data: detalle.numerosSerie.map((ns) => ({
              productoId: detalle.productoId,
              compraId: nuevaCompra.id,
              numeroSerie: ns.trim().toUpperCase(),
              estado: 'DISPONIBLE' as const,
            })),
          });
        }
      }

      return nuevaCompra;
    });

    // 3. Retornar compra completa
    return this.obtenerPorId(compra.id);
  }

  // DELETE /api/compras/:id (SoftDelete sin reverso de stock)
  async eliminar(id: string) {
    // Verificar que existe
    const compra = await this.obtenerPorId(id);

    // Modificar el número de factura para liberar el constraint único
    // Agregar sufijo -ANULADA-{timestamp} para permitir reingreso del número original
    const timestamp = Date.now();
    const nuevoNumeroFactura = `${compra.numeroFactura}-ANULADA-${timestamp}`;

    // Marcar como eliminada Y modificar número de factura
    await prisma.compra.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        numeroFactura: nuevoNumeroFactura,
      },
    });

    return {
      mensaje: 'Compra anulada correctamente. El stock no se revierte automáticamente.',
      info: 'El número de factura original ahora está disponible para reingreso.',
    };
  }
}

export default new CompraService();
