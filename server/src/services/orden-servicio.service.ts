import prisma from '../config/database';
import { Prisma, EstadoOrden, EstadoEquipoOrden } from '@prisma/client';

// Interfaces

interface EquipoOrdenInput {
  equipoId: string;
  problemaReportado: string;
  diagnosticoTecnico?: string | null;
  observacionesEsteticas?: Record<string, any> | null;
  costoEstimado?: number | null;
}

interface CrearOrdenData {
  clienteId: string;
  usuarioRegistroId: string;
  usuarioTecnicoId?: string | null;
  pagoACuenta?: number;
  equipos: EquipoOrdenInput[];
}

interface ActualizarOrdenData {
  usuarioTecnicoId?: string | null;
  pagoACuenta?: number;
}

interface ActualizarEquipoOrdenData {
  problemaReportado?: string;
  diagnosticoTecnico?: string | null;
  observacionesEsteticas?: Record<string, any> | null;
  costoEstimado?: number | null;
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

// Solo ENTREGADA se setea manualmente; el resto se deriva del estado de los equipos
const TRANSICIONES_ESTADO_GLOBAL: Record<EstadoOrden, EstadoOrden[]> = {
  RECIBIDA: [],
  EN_REPARACION: [],
  LISTA: ['ENTREGADA'],
  ENTREGADA: [],
  CANCELADA: [],
};

// Service

class OrdenServicioService {
  // Helpers

  private formatCodigo(correlativo: number, fecha: Date): string {
    const year = fecha.getFullYear();
    return `OS-${year}-${String(correlativo).padStart(4, '0')}`;
  }

  /**
   * Recalcula subtotal y ganancia de un EquipoOrden sumando sus items.
   * Debe ejecutarse dentro de una transaccion.
   */
  private async recalcularTotalesEquipo(
    tx: Prisma.TransactionClient,
    equipoOrdenId: string,
  ): Promise<void> {
    const items = await tx.itemOrden.findMany({ where: { equipoOrdenId } });

    let subtotal = new Prisma.Decimal(0);
    let ganancia = new Prisma.Decimal(0);

    for (const item of items) {
      subtotal = subtotal.add(item.subtotal);
      ganancia = ganancia.add(
        new Prisma.Decimal(item.precioUnitario).sub(item.costoUnitarioSnapshot).mul(item.cantidad),
      );
    }

    await tx.equipoOrden.update({ where: { id: equipoOrdenId }, data: { subtotal, ganancia } });
  }

  /**
   * Recalcula total y gananciaTotal de la OrdenServicio sumando los subtotales de todos sus EquipoOrden.
   * Debe ejecutarse dentro de una transaccion.
   */
  private async recalcularTotalesOrden(
    tx: Prisma.TransactionClient,
    ordenId: string,
  ): Promise<void> {
    const equipos = await tx.equipoOrden.findMany({ where: { ordenId } });

    let total = new Prisma.Decimal(0);
    let gananciaTotal = new Prisma.Decimal(0);

    for (const eq of equipos) {
      total = total.add(eq.subtotal);
      gananciaTotal = gananciaTotal.add(eq.ganancia);
    }

    await tx.ordenServicio.update({ where: { id: ordenId }, data: { total, gananciaTotal } });
  }

  /**
   * Deriva el estado global de la OrdenServicio desde el estado de sus equipos.
   * Regla:
   *   Todos CANCELADA                      -> CANCELADA
   *   Todos LISTA | CANCELADA (>=1 LISTA)  -> LISTA
   *   Al menos uno EN_REPARACION           -> EN_REPARACION
   *   Resto                                -> RECIBIDA
   * Si el estado actual es ENTREGADA, no se toca.
   */
  private async derivarEstadoOrden(
    tx: Prisma.TransactionClient,
    ordenId: string,
  ): Promise<void> {
    const orden = await tx.ordenServicio.findUniqueOrThrow({ where: { id: ordenId } });
    if (orden.estado === 'ENTREGADA') return;

    const estados = (
      await tx.equipoOrden.findMany({ where: { ordenId }, select: { estado: true } })
    ).map((e) => e.estado);

    let nuevoEstado: EstadoOrden;
    if (estados.every((e) => e === 'CANCELADA')) {
      nuevoEstado = 'CANCELADA';
    } else if (estados.every((e) => e === 'LISTA' || e === 'CANCELADA')) {
      nuevoEstado = 'LISTA';
    } else if (estados.some((e) => e === 'EN_REPARACION')) {
      nuevoEstado = 'EN_REPARACION';
    } else {
      nuevoEstado = 'RECIBIDA';
    }

    await tx.ordenServicio.update({ where: { id: ordenId }, data: { estado: nuevoEstado } });
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
        ? { fechaEmision: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lt: hasta } : {}) } }
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
          pagoACuenta: true,
          cliente: { select: { id: true, nombre: true, telefono: true } },
          equipos: {
            select: {
              id: true,
              estado: true,
              costoEstimado: true,
              subtotal: true,
              equipo: { select: { id: true, tipoEquipo: true, marca: true, modelo: true } },
            },
          },
          usuarioRegistro: { select: { id: true, nombreCompleto: true } },
          usuarioTecnico: { select: { id: true, nombreCompleto: true } },
          _count: { select: { equipos: true } },
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

  // GET /api/ordenes-servicio/:id

  async obtenerPorId(id: string) {
    const orden = await prisma.ordenServicio.findFirst({
      where: { id, deletedAt: null },
      include: {
        cliente: { select: { id: true, nombre: true, telefono: true, dniRuc: true } },
        usuarioRegistro: { select: { id: true, username: true, nombreCompleto: true } },
        usuarioTecnico: { select: { id: true, username: true, nombreCompleto: true } },
        equipos: {
          orderBy: { createdAt: 'asc' },
          include: {
            equipo: {
              select: { id: true, tipoEquipo: true, marca: true, modelo: true, numeroSerie: true },
            },
            items: {
              orderBy: { createdAt: 'asc' },
              include: {
                producto: {
                  select: {
                    id: true, nombre: true, marca: true, modelo: true,
                    sku: true, esServicio: true, imagenUrl: true,
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
    if (!data.equipos || data.equipos.length === 0) {
      throw new Error('La orden debe tener al menos un equipo');
    }

    const cliente = await prisma.cliente.findFirst({
      where: { id: data.clienteId, deletedAt: null },
    });
    if (!cliente) throw new Error('Cliente no encontrado');

    for (const eq of data.equipos) {
      const equipo = await prisma.equipoCliente.findFirst({
        where: { id: eq.equipoId, clienteId: data.clienteId },
      });
      if (!equipo) throw new Error(`Equipo ${eq.equipoId} no encontrado o no pertenece al cliente`);
    }

    if (data.usuarioTecnicoId) {
      const tecnico = await prisma.usuario.findFirst({ where: { id: data.usuarioTecnicoId } });
      if (!tecnico) throw new Error('Tecnico no encontrado');
    }

    const nuevaOrden = await prisma.$transaction(async (tx) => {
      const orden = await tx.ordenServicio.create({
        data: {
          clienteId: data.clienteId,
          usuarioRegistroId: data.usuarioRegistroId,
          usuarioTecnicoId: data.usuarioTecnicoId ?? null,
          pagoACuenta: data.pagoACuenta ? new Prisma.Decimal(data.pagoACuenta) : new Prisma.Decimal(0),
          estado: 'RECIBIDA',
        },
      });

      for (const eq of data.equipos) {
        await tx.equipoOrden.create({
          data: {
            ordenId: orden.id,
            equipoId: eq.equipoId,
            problemaReportado: eq.problemaReportado.trim(),
            diagnosticoTecnico: eq.diagnosticoTecnico?.trim() ?? null,
            observacionesEsteticas: eq.observacionesEsteticas ?? Prisma.JsonNull,
            costoEstimado: eq.costoEstimado ? new Prisma.Decimal(eq.costoEstimado) : null,
            estado: 'RECIBIDA',
          },
        });
      }

      return orden;
    });

    return this.obtenerPorId(nuevaOrden.id);
  }

  // PUT /api/ordenes-servicio/:id

  async actualizar(id: string, data: ActualizarOrdenData) {
    const orden = await prisma.ordenServicio.findFirst({ where: { id, deletedAt: null } });
    if (!orden) throw new Error('Orden de servicio no encontrada');

    if (orden.estado === 'ENTREGADA' || orden.estado === 'CANCELADA') {
      throw new Error(`No se puede editar una orden en estado ${orden.estado}`);
    }

    if (data.usuarioTecnicoId) {
      const tecnico = await prisma.usuario.findFirst({ where: { id: data.usuarioTecnicoId } });
      if (!tecnico) throw new Error('Tecnico no encontrado');
    }

    if (data.pagoACuenta !== undefined && Number(data.pagoACuenta) > Number(orden.total)) {
      throw new Error(
        `El pago a cuenta (S/ ${Number(data.pagoACuenta).toFixed(2)}) no puede superar el total (S/ ${Number(orden.total).toFixed(2)}).`,
      );
    }

    await prisma.ordenServicio.update({
      where: { id },
      data: {
        ...(data.usuarioTecnicoId !== undefined && { usuarioTecnicoId: data.usuarioTecnicoId }),
        ...(data.pagoACuenta !== undefined && { pagoACuenta: new Prisma.Decimal(data.pagoACuenta) }),
      },
    });

    return this.obtenerPorId(id);
  }

  // POST /api/ordenes-servicio/:id/equipos

  async agregarEquipo(ordenId: string, data: EquipoOrdenInput) {
    const orden = await prisma.ordenServicio.findFirst({ where: { id: ordenId, deletedAt: null } });
    if (!orden) throw new Error('Orden de servicio no encontrada');

    if (orden.estado === 'ENTREGADA' || orden.estado === 'CANCELADA') {
      throw new Error(`No se puede agregar equipos a una orden en estado ${orden.estado}`);
    }

    const equipo = await prisma.equipoCliente.findFirst({
      where: { id: data.equipoId, clienteId: orden.clienteId },
    });
    if (!equipo) throw new Error('Equipo no encontrado o no pertenece al cliente de esta orden');

    await prisma.$transaction(async (tx) => {
      await tx.equipoOrden.create({
        data: {
          ordenId,
          equipoId: data.equipoId,
          problemaReportado: data.problemaReportado.trim(),
          diagnosticoTecnico: data.diagnosticoTecnico?.trim() ?? null,
          observacionesEsteticas: data.observacionesEsteticas ?? Prisma.JsonNull,
          costoEstimado: data.costoEstimado ? new Prisma.Decimal(data.costoEstimado) : null,
          estado: 'RECIBIDA',
        },
      });
      await this.derivarEstadoOrden(tx, ordenId);
    });

    return this.obtenerPorId(ordenId);
  }

  // PUT /api/ordenes-servicio/:id/equipos/:equipoOrdenId

  async actualizarEquipo(ordenId: string, equipoOrdenId: string, data: ActualizarEquipoOrdenData) {
    const equipoOrden = await prisma.equipoOrden.findFirst({ where: { id: equipoOrdenId, ordenId } });
    if (!equipoOrden) throw new Error('Equipo no encontrado en esta orden');

    if (equipoOrden.estado === 'CANCELADA') {
      throw new Error('No se puede editar un equipo cancelado');
    }

    await prisma.equipoOrden.update({
      where: { id: equipoOrdenId },
      data: {
        ...(data.problemaReportado !== undefined && { problemaReportado: data.problemaReportado }),
        ...(data.diagnosticoTecnico !== undefined && { diagnosticoTecnico: data.diagnosticoTecnico }),
        ...(data.observacionesEsteticas !== undefined && {
          observacionesEsteticas: data.observacionesEsteticas ?? Prisma.JsonNull,
        }),
        ...(data.costoEstimado !== undefined && {
          costoEstimado: data.costoEstimado ? new Prisma.Decimal(data.costoEstimado) : null,
        }),
      },
    });

    return this.obtenerPorId(ordenId);
  }

  // DELETE /api/ordenes-servicio/:id/equipos/:equipoOrdenId

  async quitarEquipo(ordenId: string, equipoOrdenId: string, usuarioId: string) {
    const orden = await prisma.ordenServicio.findFirst({
      where: { id: ordenId, deletedAt: null },
      include: { _count: { select: { equipos: true } } },
    });
    if (!orden) throw new Error('Orden de servicio no encontrada');

    if (orden.estado === 'ENTREGADA') {
      throw new Error('No se puede quitar equipos de una orden entregada');
    }

    if (orden._count.equipos <= 1) {
      throw new Error('La orden debe tener al menos un equipo. Para cancelarla, elimine la orden.');
    }

    const equipoOrden = await prisma.equipoOrden.findFirst({
      where: { id: equipoOrdenId, ordenId },
      include: { items: { include: { producto: { select: { esServicio: true } } } } },
    });
    if (!equipoOrden) throw new Error('Equipo no encontrado en esta orden');

    await prisma.$transaction(async (tx) => {
      for (const item of equipoOrden.items) {
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
              motivo: `Devolucion por equipo quitado de ${this.formatCodigo(orden.codigoCorrelativo, orden.fechaEmision)}`,
              ordenServicioId: ordenId,
            },
          });
        }
      }
      // onDelete: Cascade en EquipoOrden elimina sus items y notas automaticamente
      await tx.equipoOrden.delete({ where: { id: equipoOrdenId } });
      await this.recalcularTotalesOrden(tx, ordenId);
      await this.derivarEstadoOrden(tx, ordenId);
    });

    return this.obtenerPorId(ordenId);
  }

  // PATCH /api/ordenes-servicio/:id/equipos/:equipoOrdenId/estado

  async cambiarEstadoEquipo(
    ordenId: string,
    equipoOrdenId: string,
    nuevoEstado: EstadoEquipoOrden,
    usuarioId: string,
  ) {
    const orden = await prisma.ordenServicio.findFirst({ where: { id: ordenId, deletedAt: null } });
    if (!orden) throw new Error('Orden de servicio no encontrada');

    if (orden.estado === 'ENTREGADA') {
      throw new Error('No se puede modificar una orden ya entregada');
    }

    const equipoOrden = await prisma.equipoOrden.findFirst({
      where: { id: equipoOrdenId, ordenId },
      include: { items: { include: { producto: { select: { esServicio: true } } } } },
    });
    if (!equipoOrden) throw new Error('Equipo no encontrado en esta orden');

    await prisma.$transaction(async (tx) => {
      if (nuevoEstado === 'CANCELADA' && equipoOrden.estado !== 'CANCELADA') {
        for (const item of equipoOrden.items) {
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
                motivo: `Devolucion por cancelacion de equipo en ${this.formatCodigo(orden.codigoCorrelativo, orden.fechaEmision)}`,
                ordenServicioId: ordenId,
              },
            });
          }
        }
      }

      await tx.equipoOrden.update({ where: { id: equipoOrdenId }, data: { estado: nuevoEstado } });
      await this.derivarEstadoOrden(tx, ordenId);
    });

    return this.obtenerPorId(ordenId);
  }

  // POST /api/ordenes-servicio/:id/equipos/:equipoOrdenId/items

  async agregarItem(
    ordenId: string,
    equipoOrdenId: string,
    data: AgregarItemData,
    usuarioId: string,
  ) {
    const orden = await prisma.ordenServicio.findFirst({ where: { id: ordenId, deletedAt: null } });
    if (!orden) throw new Error('Orden de servicio no encontrada');

    if (orden.estado === 'ENTREGADA' || orden.estado === 'CANCELADA') {
      throw new Error(`No se puede agregar items a una orden en estado ${orden.estado}`);
    }

    const equipoOrden = await prisma.equipoOrden.findFirst({ where: { id: equipoOrdenId, ordenId } });
    if (!equipoOrden) throw new Error('Equipo no encontrado en esta orden');

    if (equipoOrden.estado === 'CANCELADA') {
      throw new Error('No se pueden agregar items a un equipo cancelado');
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

    await prisma.$transaction(async (tx) => {
      const subtotal = new Prisma.Decimal(data.precioUnitario).mul(data.cantidad);

      await tx.itemOrden.create({
        data: {
          equipoOrdenId,
          productoId: data.productoId,
          cantidad: data.cantidad,
          precioUnitario: new Prisma.Decimal(data.precioUnitario),
          costoUnitarioSnapshot: producto.precioCompra,
          subtotal,
        },
      });

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

      await this.recalcularTotalesEquipo(tx, equipoOrdenId);
      await this.recalcularTotalesOrden(tx, ordenId);
    });

    return this.obtenerPorId(ordenId);
  }

  // DELETE /api/ordenes-servicio/:id/items/:itemId

  async quitarItem(ordenId: string, itemId: string, usuarioId: string) {
    const orden = await prisma.ordenServicio.findFirst({ where: { id: ordenId, deletedAt: null } });
    if (!orden) throw new Error('Orden de servicio no encontrada');

    if (orden.estado === 'ENTREGADA' || orden.estado === 'CANCELADA') {
      throw new Error(`No se puede quitar items de una orden en estado ${orden.estado}`);
    }

    const item = await prisma.itemOrden.findFirst({
      where: { id: itemId },
      include: {
        equipoOrden: { select: { ordenId: true, estado: true } },
        producto: { select: { esServicio: true } },
      },
    });
    if (!item || item.equipoOrden.ordenId !== ordenId) {
      throw new Error('Item no encontrado en esta orden');
    }

    await prisma.$transaction(async (tx) => {
      await tx.itemOrden.delete({ where: { id: itemId } });

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
            motivo: `Devolucion — item quitado de ${this.formatCodigo(orden.codigoCorrelativo, orden.fechaEmision)}`,
            ordenServicioId: ordenId,
          },
        });
      }

      await this.recalcularTotalesEquipo(tx, item.equipoOrdenId);
      await this.recalcularTotalesOrden(tx, ordenId);
    });

    return this.obtenerPorId(ordenId);
  }

  // PATCH /api/ordenes-servicio/:id/estado (solo ENTREGADA, manual)

  async cambiarEstado(ordenId: string, nuevoEstado: EstadoOrden, _usuarioId: string) {
    if (nuevoEstado !== 'ENTREGADA') {
      throw new Error(
        'Solo se puede cambiar el estado global a ENTREGADA manualmente. El resto se deriva del estado de los equipos.',
      );
    }

    const orden = await prisma.ordenServicio.findFirst({ where: { id: ordenId, deletedAt: null } });
    if (!orden) throw new Error('Orden de servicio no encontrada');

    if (!TRANSICIONES_ESTADO_GLOBAL[orden.estado].includes(nuevoEstado)) {
      throw new Error(
        `Transicion invalida: ${orden.estado} -> ${nuevoEstado}. Solo se puede marcar ENTREGADA desde LISTA.`,
      );
    }

    const saldo = Number(orden.total) - Number(orden.pagoACuenta);
    if (saldo > 0.004) {
      throw new Error(
        `No se puede entregar la orden con saldo pendiente de S/ ${saldo.toFixed(2)}.`,
      );
    }

    await prisma.ordenServicio.update({
      where: { id: ordenId },
      data: { estado: 'ENTREGADA', fechaEntrega: new Date() },
    });

    return this.obtenerPorId(ordenId);
  }

  // DELETE /api/ordenes-servicio/:id

  async eliminar(id: string) {
    const orden = await prisma.ordenServicio.findFirst({ where: { id, deletedAt: null } });
    if (!orden) throw new Error('Orden de servicio no encontrada');

    if (orden.estado !== 'RECIBIDA' && orden.estado !== 'CANCELADA') {
      throw new Error(
        `Solo se pueden eliminar ordenes en estado RECIBIDA o CANCELADA. Estado actual: ${orden.estado}`,
      );
    }

    return prisma.ordenServicio.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

export const ordenServicioService = new OrdenServicioService();
export default ordenServicioService;
