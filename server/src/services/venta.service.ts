import prisma from '../config/database';
import { Prisma } from '@prisma/client';

interface DetalleVentaInput {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  numerosSerie?: string[]; // Opcional, para productos que requieren serie
}

interface CrearVentaData {
  clienteId?: string | null;
  clienteNombre?: string | null;
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
  // Helpers

  private formatCodigo(correlativo: number, fecha: Date): string {
    const year = fecha.getFullYear();
    return `VTA-${year}-${String(correlativo).padStart(4, '0')}`;
  }

  private async nextCorrelativo(tx: Prisma.TransactionClient, anio: number): Promise<number> {
    const ultimo = await tx.venta.findFirst({
      where: { anioCorrelativo: anio },
      orderBy: { codigoCorrelativo: 'desc' },
      select: { codigoCorrelativo: true },
    });
    return (ultimo?.codigoCorrelativo ?? 0) + 1;
  }

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
          cliente: {
            select: { id: true, nombre: true, dniRuc: true, telefono: true },
          },
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

    return {
      ventas: ventas.map((v) => ({
        ...v,
        codigoFormateado: this.formatCodigo(v.codigoCorrelativo, v.fecha),
      })),
      total,
    };
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
        cliente: {
          select: { id: true, nombre: true, dniRuc: true, telefono: true },
        },
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

    return {
      ...venta,
      codigoFormateado: this.formatCodigo(venta.codigoCorrelativo, venta.fecha),
    };
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

      // Bloquear venta en pérdida: el precio unitario no puede ser menor al CPP
      if (new Prisma.Decimal(detalle.precioUnitario).lessThan(producto.precioCompra)) {
        throw new Error(
          `No se puede vender "${producto.nombre}" en pérdida. Precio de venta (S/ ${detalle.precioUnitario}) es menor al costo promedio (S/ ${Number(producto.precioCompra).toFixed(2)}). Actualiza el precio del producto antes de realizar la venta.`
        );
      }

      // Los servicios no tienen control de stock
      if (!producto.esServicio && producto.stockActual < detalle.cantidad) {
        throw new Error(
          `Stock insuficiente para "${producto.nombre}". Stock disponible: ${producto.stockActual}, solicitado: ${detalle.cantidad}`
        );
      }

      // Validar series para productos que las requieren
      if (producto.requiereSerie) {
        const { numerosSerie } = detalle;

        // Validar que se hayan enviado las series
        if (!numerosSerie || numerosSerie.length === 0) {
          throw new Error(`El producto "${producto.nombre}" requiere números de serie`);
        }

        // Validar que la cantidad de series coincida con la cantidad de productos
        if (numerosSerie.length !== detalle.cantidad) {
          throw new Error(
            `El producto "${producto.nombre}" requiere ${detalle.cantidad} series, pero se proporcionaron ${numerosSerie.length}`
          );
        }

        // Validar que no haya series duplicadas en el array
        const seriesUnicas = new Set(numerosSerie);
        if (seriesUnicas.size !== numerosSerie.length) {
          throw new Error(`Se encontraron números de serie duplicados para "${producto.nombre}"`);
        }

        // Validar que todas las series existan y estén DISPONIBLES
        for (const numeroSerie of numerosSerie) {
          const serie = await prisma.productoSerie.findFirst({
            where: {
              numeroSerie,
              productoId: producto.id,
            },
          });

          if (!serie) {
            throw new Error(
              `El número de serie "${numeroSerie}" no existe para el producto "${producto.nombre}"`
            );
          }

          if (serie.estado !== 'DISPONIBLE') {
            throw new Error(
              `El número de serie "${numeroSerie}" no está disponible (estado actual: ${serie.estado})`
            );
          }
        }
      }
    }

    // 2. Transacción ACID: todo o nada
    const venta = await prisma.$transaction(async (tx) => {
      // Calcular totales
      let totalVenta = new Prisma.Decimal(0);
      let gananciaTotal = new Prisma.Decimal(0);

      // Pre-cargar productos para cálculos y snapshot
      const productosMap = new Map<string, { precioCompra: Prisma.Decimal; nombre: string; esServicio: boolean; garantiaClienteMeses: number }>();
      for (const detalle of detalles) {
        const producto = await tx.producto.findUniqueOrThrow({
          where: { id: detalle.productoId },
          select: { precioCompra: true, nombre: true, esServicio: true, garantiaClienteMeses: true },
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
      const ahora = new Date();
      const anio = ahora.getFullYear();
      const correlativo = await this.nextCorrelativo(tx, anio);

      let finalClienteNombre = clienteNombre?.trim() || null;
      if (data.clienteId && !finalClienteNombre) {
        const cli = await tx.cliente.findUnique({
          where: { id: data.clienteId },
          select: { nombre: true },
        });
        if (cli) finalClienteNombre = cli.nombre;
      }

      const nuevaVenta = await tx.venta.create({
        data: {
          codigoCorrelativo: correlativo,
          anioCorrelativo: anio,
          usuarioId,
          clienteId: data.clienteId || null,
          clienteNombre: finalClienteNombre,
          metodoPago,
          total: totalVenta,
          gananciaTotal,
          estado: 'COMPLETADA',
        },
        include: {
          cliente: {
            select: { id: true, nombre: true, dniRuc: true, telefono: true },
          },
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

        // Marcar series como VENDIDO con snapshot de garantía del cliente
        if (detalle.numerosSerie && detalle.numerosSerie.length > 0) {
          for (const numeroSerie of detalle.numerosSerie) {
            await tx.productoSerie.updateMany({
              where: {
                numeroSerie,
                productoId: detalle.productoId,
                estado: 'DISPONIBLE', // Solo actualizar si está disponible
              },
              data: {
                estado: 'VENDIDO',
                ventaId: nuevaVenta.id,
                garantiaClienteMeses: producto.garantiaClienteMeses,
              },
            });
          }
        }

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
              motivo: `Venta ${this.formatCodigo(nuevaVenta.codigoCorrelativo, nuevaVenta.fecha)}`,
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
