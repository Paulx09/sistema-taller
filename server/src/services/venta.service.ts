import prisma from '../config/database';
import { Prisma } from '@prisma/client';

interface DetalleVentaInput {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
}

interface CrearVentaData {
  clienteNombre?: string;
  metodoPago: 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN';
  detalles: DetalleVentaInput[];
  usuarioId: string;
}

interface FiltrosVenta {
  desde?: Date;
  hasta?: Date;
  skip?: number;
  take?: number;
}

class VentaService {
  // GET /api/ventas — lista paginada con filtros
  async listar(filtros: FiltrosVenta = {}) {
    const { desde, hasta, skip = 0, take = 50 } = filtros;

    const where: Prisma.VentaWhereInput = {
      deletedAt: null,
      ...(desde || hasta
        ? {
            fecha: {
              ...(desde ? { gte: desde } : {}),
              ...(hasta ? { lt: hasta } : {}), // lt (less than) porque ya sumamos 1 día
            },
          }
        : {}),
    };

    const [ventas, total] = await Promise.all([
      prisma.venta.findMany({
        where,
        skip,
        take,
        orderBy: { fecha: 'desc' },
        include: {
          usuario: {
            select: { id: true, username: true, nombreCompleto: true },
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
                },
              },
            },
          },
        },
      }),
      prisma.venta.count({ where }),
    ]);

    return { ventas, total };
  }

  // GET /api/ventas/hoy — ventas del día actual (para Dashboard)
  async listarHoy() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    return this.listar({ desde: hoy, hasta: manana });
  }

  // GET /api/ventas/:id — detalle completo
  async obtenerPorId(id: string) {
    const venta = await prisma.venta.findFirst({
      where: { id, deletedAt: null },
      include: {
        usuario: {
          select: { id: true, username: true, nombreCompleto: true },
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
                imagenUrl: true,
                categoria: { select: { id: true, nombre: true } },
              },
            },
          },
        },
      },
    });

    if (!venta) {
      throw new Error('Venta no encontrada');
    }

    return venta;
  }

  // POST /api/ventas — crear venta con transacción ACID
  async crear(data: CrearVentaData) {
    const { clienteNombre, metodoPago, detalles, usuarioId } = data;

    // 1. Verificar stock de TODOS los productos antes de iniciar la transacción
    for (const detalle of detalles) {
      const producto = await prisma.producto.findFirst({
        where: { id: detalle.productoId, deletedAt: null },
      });

      if (!producto) {
        throw new Error(`Producto no encontrado: ${detalle.productoId}`);
      }

      // Los servicios no tienen control de stock
      if (!producto.esServicio && producto.stockActual < detalle.cantidad) {
        throw new Error(
          `Stock insuficiente para "${producto.nombre}". Stock disponible: ${producto.stockActual}, solicitado: ${detalle.cantidad}`
        );
      }
    }

    // 2. Transacción ACID: todo o nada
    const venta = await prisma.$transaction(async (tx) => {
      // Calcular totales
      let totalVenta = new Prisma.Decimal(0);
      let gananciaTotal = new Prisma.Decimal(0);

      // Pre-cargar productos para cálculos y snapshot
      const productosMap = new Map<string, { precioCompra: Prisma.Decimal; nombre: string; esServicio: boolean }>();
      for (const detalle of detalles) {
        const producto = await tx.producto.findUniqueOrThrow({
          where: { id: detalle.productoId },
          select: { precioCompra: true, nombre: true, esServicio: true },
        });
        productosMap.set(detalle.productoId, producto);
      }

      for (const detalle of detalles) {
        const producto = productosMap.get(detalle.productoId)!;
        const subtotal = new Prisma.Decimal(detalle.precioUnitario).mul(detalle.cantidad);
        const gananciaDetalle = new Prisma.Decimal(detalle.precioUnitario)
          .sub(producto.precioCompra)
          .mul(detalle.cantidad);

        totalVenta = totalVenta.add(subtotal);
        gananciaTotal = gananciaTotal.add(gananciaDetalle);
      }

      // 2a. Crear la Venta
      const nuevaVenta = await tx.venta.create({
        data: {
          usuarioId,
          clienteNombre: clienteNombre || null,
          metodoPago,
          total: totalVenta,
          gananciaTotal,
          estado: 'COMPLETADA',
        },
      });

      // 2b. Crear DetalleVenta + descontar stock + registrar MovimientoStock por cada ítem
      for (const detalle of detalles) {
        const producto = productosMap.get(detalle.productoId)!;
        const subtotal = new Prisma.Decimal(detalle.precioUnitario).mul(detalle.cantidad);

        // Crear DetalleVenta con snapshot del costo actual
        await tx.detalleVenta.create({
          data: {
            ventaId: nuevaVenta.id,
            productoId: detalle.productoId,
            cantidad: detalle.cantidad,
            precioUnitario: new Prisma.Decimal(detalle.precioUnitario),
            costoUnitarioSnapshot: producto.precioCompra,
            subtotal,
          },
        });

        // Solo descontar stock y registrar movimiento para productos físicos
        if (!producto.esServicio) {
          // Descontar stock
          await tx.producto.update({
            where: { id: detalle.productoId },
            data: {
              stockActual: { decrement: detalle.cantidad },
            },
          });

          // Registrar MovimientoStock tipo SALIDA
          await tx.movimientoStock.create({
            data: {
              productoId: detalle.productoId,
              usuarioId,
              tipo: 'SALIDA',
              cantidad: detalle.cantidad,
              motivo: `Venta #${nuevaVenta.codigoCorrelativo}`,
            },
          });
        }
      }

      return nuevaVenta;
    });

    // 3. Retornar la venta completa con detalles
    return this.obtenerPorId(venta.id);
  }
}

export default new VentaService();
