import prisma from '../config/database';
import { Prisma, EstadoOrden } from '@prisma/client';

// Interfaces

interface CrearOrdenData {
  clienteId: string;
  equipoId: string;
  usuarioRegistroId: string;
  usuarioTecnicoId?: string | null;
  problemaReportado: string;
  diagnosticoInicial?: string | null;
  observacionesEsteticas?: Record<string, any> | null;
  costoEstimado?: number | null;
  pagoACuenta?: number;
}

interface ActualizarOrdenData {
  usuarioTecnicoId?: string | null;
  diagnosticoInicial?: string | null;
  observacionesEsteticas?: Record<string, any> | null;
  costoEstimado?: number | null;
  pagoACuenta?: number;
  problemaReportado?: string;
}

interface AgregarItemData {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
}

interface FiltrosOrden {
  estado?: EstadoOrden;
  clienteId?: string;
  usuarioTecnicoId?: string;
  desde?: Date;
  hasta?: Date;
  skip?: number;
  take?: number;
}

// Transiciones de estado válidas
const TRANSICIONES_VALIDAS: Record<EstadoOrden, EstadoOrden[]> = {
  RECIBIDA: ['EN_REPARACION', 'CANCELADA'],
  EN_REPARACION: ['LISTA', 'CANCELADA'],
  LISTA: ['EN_REPARACION', 'ENTREGADA', 'CANCELADA'],
  ENTREGADA: [],
  CANCELADA: [],
};

// Service 

class OrdenServicioService {
  // Helpers

  /** Formatea el código correlativo → OS-2026-0001 */
  private formatCodigo(correlativo: number, fecha: Date): string {
    const year = fecha.getFullYear();
    return `OS-${year}-${String(correlativo).padStart(4, '0')}`;
  }

  /**
   * Recalcula total y gananciaTotal de la orden sumando todos sus ítems.
   * Debe ejecutarse dentro de una transacción (tx).
   */
  private async recalcularTotales(
    tx: Prisma.TransactionClient,
    ordenId: string,
  ): Promise<void> {
    const items = await tx.itemOrden.findMany({ where: { ordenId } });

    // Calcular suma de items dentro de la transacción
    const ordenCompleta = await tx.ordenServicio.findUniqueOrThrow({
      where: { id: ordenId },
      include: {
        items: {
          include: {
            producto: { select: { esServicio: true } },
          },
        },
      },
    });

    let total = new Prisma.Decimal(0);
    let gananciaTotal = new Prisma.Decimal(0);

    for (const item of ordenCompleta.items) {
      total = total.add(item.subtotal);
      const gananciaItem = new Prisma.Decimal(item.precioUnitario)
        .sub(item.costoUnitarioSnapshot)
        .mul(item.cantidad);
      gananciaTotal = gananciaTotal.add(gananciaItem);
    }

    await tx.ordenServicio.update({
      where: { id: ordenId },
      data: { total, gananciaTotal },
    });
  }

  // GET /api/ordenes-servicio

  async listar(filtros: FiltrosOrden = {}) {
    const { estado, clienteId, usuarioTecnicoId, desde, hasta, skip = 0, take = 50 } = filtros;

    const where: Prisma.OrdenServicioWhereInput = {
      deletedAt: null,
      ...(estado ? { estado } : {}),
      ...(clienteId ? { clienteId } : {}),
      ...(usuarioTecnicoId ? { usuarioTecnicoId } : {}),
      ...(desde || hasta
        ? {
            fechaEmision: {
              ...(desde ? { gte: desde } : {}),
              ...(hasta ? { lt: hasta } : {}),
            },
          }
        : {}),
    };

    const [ordenes, total] = await Promise.all([
      prisma.ordenServicio.findMany({
        where,
        skip,
        take,
        orderBy: { fechaEmision: 'desc' },
        select: {
          id: true,
          codigoCorrelativo: true,
          estado: true,
          fechaEmision: true,
          total: true,
          costoEstimado: true,
          pagoACuenta: true,
          problemaReportado: true,
          cliente: { select: { id: true, nombre: true, telefono: true } },
          equipo: { select: { id: true, tipoEquipo: true, marca: true, modelo: true } },
          usuarioRegistro: { select: { id: true, nombreCompleto: true } },
          usuarioTecnico: { select: { id: true, nombreCompleto: true } },
          _count: { select: { items: true, notas: true } },
        },
      }),
      prisma.ordenServicio.count({ where }),
    ]);

    return {
      ordenes: ordenes.map((o) => ({
        ...o,
        codigoFormateado: this.formatCodigo(o.codigoCorrelativo, o.fechaEmision),
      })),
      total,
    };
  }

  async obtenerPorId(id: string) {
    const orden = await prisma.ordenServicio.findFirst({
      where: { id, deletedAt: null },
      include: {
        cliente: { select: { id: true, nombre: true, telefono: true, dniRuc: true } },
        equipo: {
          select: {
            id: true,
            tipoEquipo: true,
            marca: true,
            modelo: true,
            numeroSerie: true,
          },
        },
        usuarioRegistro: { select: { id: true, username: true, nombreCompleto: true } },
        usuarioTecnico: { select: { id: true, username: true, nombreCompleto: true } },
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                marca: true,
                modelo: true,
                sku: true,
                esServicio: true,
                imagenUrl: true,
              },
            },
          },
        },
        notas: {
          orderBy: { createdAt: 'asc' },
          include: {
            usuario: { select: { id: true, username: true, nombreCompleto: true } },
          },
        },
      },
    });

    if (!orden) throw new Error('Orden de servicio no encontrada');

    return {
      ...orden,
      codigoFormateado: this.formatCodigo(orden.codigoCorrelativo, orden.fechaEmision),
    };
  }

  // POST /api/ordenes-servicio

  async crear(data: CrearOrdenData) {
    // Validar cliente
    const cliente = await prisma.cliente.findFirst({
      where: { id: data.clienteId, deletedAt: null },
    });
    if (!cliente) throw new Error('Cliente no encontrado');

    // Validar equipo pertenece al cliente
    const equipo = await prisma.equipoCliente.findFirst({
      where: { id: data.equipoId, clienteId: data.clienteId },
    });
    if (!equipo) throw new Error('Equipo no encontrado o no pertenece al cliente');

    // Validar técnico si se especifica
    if (data.usuarioTecnicoId) {
      const tecnico = await prisma.usuario.findFirst({
        where: { id: data.usuarioTecnicoId },
      });
      if (!tecnico) throw new Error('Técnico no encontrado');
    }

    const orden = await prisma.ordenServicio.create({
      data: {
        clienteId: data.clienteId,
        equipoId: data.equipoId,
        usuarioRegistroId: data.usuarioRegistroId,
        usuarioTecnicoId: data.usuarioTecnicoId ?? null,
        problemaReportado: data.problemaReportado,
        diagnosticoInicial: data.diagnosticoInicial ?? null,
        observacionesEsteticas: data.observacionesEsteticas ?? Prisma.JsonNull,
        costoEstimado: data.costoEstimado ? new Prisma.Decimal(data.costoEstimado) : null,
        pagoACuenta: data.pagoACuenta ? new Prisma.Decimal(data.pagoACuenta) : new Prisma.Decimal(0),
        estado: 'RECIBIDA',
      },
    });

    return this.obtenerPorId(orden.id);
  }

  // PUT /api/ordenes-servicio/:id

  async actualizar(id: string, data: ActualizarOrdenData) {
    const orden = await prisma.ordenServicio.findFirst({
      where: { id, deletedAt: null },
    });
    if (!orden) throw new Error('Orden de servicio no encontrada');

    if (orden.estado === 'ENTREGADA' || orden.estado === 'CANCELADA') {
      throw new Error(`No se puede editar una orden en estado ${orden.estado}`);
    }

    if (data.usuarioTecnicoId) {
      const tecnico = await prisma.usuario.findFirst({ where: { id: data.usuarioTecnicoId } });
      if (!tecnico) throw new Error('Técnico no encontrado');
    }

    if (data.pagoACuenta !== undefined && Number(data.pagoACuenta) > Number(orden.total)) {
      throw new Error(
        `El pago a cuenta (S/ ${Number(data.pagoACuenta).toFixed(2)}) no puede superar el total de la orden (S/ ${Number(orden.total).toFixed(2)}).`,
      );
    }

    await prisma.ordenServicio.update({
      where: { id },
      data: {
        ...(data.problemaReportado !== undefined && { problemaReportado: data.problemaReportado }),
        ...(data.diagnosticoInicial !== undefined && { diagnosticoInicial: data.diagnosticoInicial }),
        ...(data.observacionesEsteticas !== undefined && {
          observacionesEsteticas: data.observacionesEsteticas ?? Prisma.JsonNull,
        }),
        ...(data.costoEstimado !== undefined && {
          costoEstimado: data.costoEstimado ? new Prisma.Decimal(data.costoEstimado) : null,
        }),
        ...(data.pagoACuenta !== undefined && { pagoACuenta: new Prisma.Decimal(data.pagoACuenta) }),
        ...(data.usuarioTecnicoId !== undefined && { usuarioTecnicoId: data.usuarioTecnicoId }),
      },
    });

    return this.obtenerPorId(id);
  }

  // POST /api/ordenes-servicio/:id/items

  async agregarItem(ordenId: string, data: AgregarItemData, usuarioId: string) {
    // Pre-validaciones fuera de la transacción
    const orden = await prisma.ordenServicio.findFirst({
      where: { id: ordenId, deletedAt: null },
    });
    if (!orden) throw new Error('Orden de servicio no encontrada');

    if (orden.estado === 'ENTREGADA' || orden.estado === 'CANCELADA') {
      throw new Error(`No se puede agregar ítems a una orden en estado ${orden.estado}`);
    }

    const producto = await prisma.producto.findFirst({
      where: { id: data.productoId, deletedAt: null },
    });
    if (!producto) throw new Error('Producto no encontrado');

    if (!producto.esServicio && producto.stockActual < data.cantidad) {
      throw new Error(
        `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stockActual}, solicitado: ${data.cantidad}`,
      );
    }

    // Transacción ACID
    await prisma.$transaction(async (tx) => {
      const subtotal = new Prisma.Decimal(data.precioUnitario).mul(data.cantidad);

      // 1. Crear el ítem con snapshot del costo actual
      await tx.itemOrden.create({
        data: {
          ordenId,
          productoId: data.productoId,
          cantidad: data.cantidad,
          precioUnitario: new Prisma.Decimal(data.precioUnitario),
          costoUnitarioSnapshot: producto.precioCompra,
          subtotal,
        },
      });

      // 2. Solo para productos físicos: descontar stock y registrar movimiento
      if (!producto.esServicio) {
        await tx.producto.update({
          where: { id: data.productoId },
          data: { stockActual: { decrement: data.cantidad } },
        });

        await tx.movimientoStock.create({
          data: {
            productoId: data.productoId,
            usuarioId,
            tipo: 'SALIDA',
            cantidad: data.cantidad,
            motivo: `Uso en ${this.formatCodigo(orden.codigoCorrelativo, orden.fechaEmision)}`,

            ordenServicioId: ordenId,
          },
        });
      }

      // 3. Recalcular totales de la orden
      await this.recalcularTotales(tx, ordenId);
    });

    return this.obtenerPorId(ordenId);
  }

  // DELETE /api/ordenes-servicio/:id/items/:itemId

  async quitarItem(ordenId: string, itemId: string, usuarioId: string) {
    const orden = await prisma.ordenServicio.findFirst({
      where: { id: ordenId, deletedAt: null },
    });
    if (!orden) throw new Error('Orden de servicio no encontrada');

    if (orden.estado === 'ENTREGADA' || orden.estado === 'CANCELADA') {
      throw new Error(`No se puede quitar ítems de una orden en estado ${orden.estado}`);
    }

    const item = await prisma.itemOrden.findFirst({
      where: { id: itemId, ordenId },
      include: { producto: { select: { esServicio: true, nombre: true } } },
    });
    if (!item) throw new Error('Ítem no encontrado en esta orden');

    await prisma.$transaction(async (tx) => {
      // 1. Eliminar el ítem
      await tx.itemOrden.delete({ where: { id: itemId } });

      // 2. Devolver stock para productos físicos
      if (!item.producto.esServicio) {
        await tx.producto.update({
          where: { id: item.productoId },
          data: { stockActual: { increment: item.cantidad } },
        });

        await tx.movimientoStock.create({
          data: {
            productoId: item.productoId,
            usuarioId,
            tipo: 'ENTRADA',
            cantidad: item.cantidad,
            motivo: `Devolución — ítem quitado de ${this.formatCodigo(orden.codigoCorrelativo, orden.fechaEmision)}`,

            ordenServicioId: ordenId,
          },
        });
      }

      // 3. Recalcular totales
      await this.recalcularTotales(tx, ordenId);
    });

    return this.obtenerPorId(ordenId);
  }

  // PATCH /api/ordenes-servicio/:id/estado

  async cambiarEstado(ordenId: string, nuevoEstado: EstadoOrden, usuarioId: string) {
    const orden = await prisma.ordenServicio.findFirst({
      where: { id: ordenId, deletedAt: null },
      include: {
        items: {
          include: { producto: { select: { esServicio: true } } },
        },
      },
    });
    if (!orden) throw new Error('Orden de servicio no encontrada');

    const transicionesPermitidas = TRANSICIONES_VALIDAS[orden.estado];
    if (!transicionesPermitidas.includes(nuevoEstado)) {
      throw new Error(
        `Transición de estado inválida: ${orden.estado} → ${nuevoEstado}. ` +
          `Transiciones permitidas desde ${orden.estado}: ${transicionesPermitidas.join(', ') || 'ninguna'}`,
      );
    }

    if (nuevoEstado === 'ENTREGADA') {
      const saldo = Number(orden.total) - Number(orden.pagoACuenta);
      if (saldo > 0.004) {
        throw new Error(
          `No se puede entregar la orden con saldo pendiente de S/ ${saldo.toFixed(2)}. Registre el pago antes de entregar.`,
        );
      }
    }

    if (nuevoEstado === 'CANCELADA') {
      // Revertir stock de todos los ítems físicos dentro de una transacción
      await prisma.$transaction(async (tx) => {
        for (const item of orden.items) {
          if (!item.producto.esServicio) {
            await tx.producto.update({
              where: { id: item.productoId },
              data: { stockActual: { increment: item.cantidad } },
            });

            await tx.movimientoStock.create({
              data: {
                productoId: item.productoId,
                usuarioId,
                tipo: 'ENTRADA',
                cantidad: item.cantidad,
                motivo: `Devolución por cancelación de ${this.formatCodigo(orden.codigoCorrelativo, orden.fechaEmision)}`,

                ordenServicioId: ordenId,
              },
            });
          }
        }

        await tx.ordenServicio.update({
          where: { id: ordenId },
          data: { estado: 'CANCELADA' },
        });
      });
    } else {
      await prisma.ordenServicio.update({
        where: { id: ordenId },
        data: {
          estado: nuevoEstado,
          ...(nuevoEstado === 'ENTREGADA' ? { fechaEntrega: new Date() } : {}),
        },
      });
    }

    return this.obtenerPorId(ordenId);
  }

  // DELETE /api/ordenes-servicio/:id

  async eliminar(id: string) {
    const orden = await prisma.ordenServicio.findFirst({
      where: { id, deletedAt: null },
    });
    if (!orden) throw new Error('Orden de servicio no encontrada');

    if (orden.estado !== 'RECIBIDA' && orden.estado !== 'CANCELADA') {
      throw new Error(
        `Solo se pueden eliminar órdenes en estado RECIBIDA o CANCELADA. Estado actual: ${orden.estado}`,
      );
    }

    return prisma.ordenServicio.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const ordenServicioService = new OrdenServicioService();
export default ordenServicioService;
