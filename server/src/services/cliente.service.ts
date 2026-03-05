import prisma from '../config/database';
import { Prisma } from '@prisma/client';

interface CrearClienteData {
  nombre: string;
  dniRuc?: string | null;
  telefono?: string | null;
  direccion?: string | null;
}

interface ActualizarClienteData {
  nombre?: string;
  dniRuc?: string | null;
  telefono?: string | null;
  direccion?: string | null;
}

interface FiltrosCliente {
  busqueda?: string;
  skip?: number;
  take?: number;
}

class ClienteService {
  // GET /api/clientes
  async listar(filtros: FiltrosCliente = {}) {
    const { busqueda, skip = 0, take = 50 } = filtros;

    const where: Prisma.ClienteWhereInput = {
      deletedAt: null,
      ...(busqueda
        ? {
            OR: [
              { nombre: { contains: busqueda, mode: 'insensitive' } },
              { dniRuc: { contains: busqueda, mode: 'insensitive' } },
              { telefono: { contains: busqueda, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [clientes, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        skip,
        take,
        orderBy: { nombre: 'asc' },
        select: {
          id: true,
          nombre: true,
          dniRuc: true,
          telefono: true,
          direccion: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              equipos: true,
              ordenes: true,
              ventas: true,
            },
          },
        },
      }),
      prisma.cliente.count({ where }),
    ]);

    return { clientes, total };
  }

  // GET /api/clientes/:id
  async obtenerPorId(id: string) {
    const cliente = await prisma.cliente.findFirst({
      where: { id, deletedAt: null },
      include: {
        equipos: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            tipoEquipo: true,
            marca: true,
            modelo: true,
            numeroSerie: true,
            // contrasenaPatron NO se incluye aquí por seguridad
            createdAt: true,
            _count: { select: { equiposOrdenes: true } },
          },
        },
        ordenes: {
          where: { deletedAt: null },
          orderBy: { fechaEmision: 'desc' },
          take: 10,
          select: {
            id: true,
            codigoCorrelativo: true,
            estado: true,
            fechaEmision: true,
            total: true,
            equipos: {
              select: {
                equipo: { select: { tipoEquipo: true, marca: true, modelo: true } },
              },
            },
          },
        },
        ventas: {
          where: { deletedAt: null },
          orderBy: { fecha: 'desc' },
          take: 10,
          select: {
            id: true,
            codigoCorrelativo: true,
            fecha: true,
            total: true,
            estado: true,
          },
        },
        _count: {
          select: { equipos: true, ordenes: true, ventas: true },
        },
      },
    });

    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }

    return cliente;
  }

  // POST /api/clientes
  async crear(data: CrearClienteData) {
    // Solo el DNI (8 dígitos) es único por persona. El RUC (11 dígitos) puede
    // repetirse porque varias personas pueden pertenecer a la misma empresa.
    if (data.dniRuc?.length === 8) {
      const existente = await prisma.cliente.findFirst({
        where: { dniRuc: data.dniRuc, deletedAt: null },
      });
      if (existente) {
        throw new Error(`Ya existe un cliente registrado con el DNI ${data.dniRuc}`);
      }
    }

    return prisma.cliente.create({
      data: {
        nombre: data.nombre,
        dniRuc: data.dniRuc ?? null,
        telefono: data.telefono ?? null,
        direccion: data.direccion ?? null,
      },
    });
  }

  // PUT /api/clientes/:id
  async actualizar(id: string, data: ActualizarClienteData) {
    const cliente = await prisma.cliente.findFirst({
      where: { id, deletedAt: null },
    });

    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }

    if (data.dniRuc && data.dniRuc !== cliente.dniRuc && data.dniRuc?.length === 8) {
      const existente = await prisma.cliente.findFirst({
        where: { dniRuc: data.dniRuc, deletedAt: null, NOT: { id } },
      });
      if (existente) {
        throw new Error(`Ya existe un cliente registrado con el DNI ${data.dniRuc}`);
      }
    }

    return prisma.cliente.update({
      where: { id },
      data: {
        ...(data.nombre !== undefined && { nombre: data.nombre }),
        ...(data.dniRuc !== undefined && { dniRuc: data.dniRuc }),
        ...(data.telefono !== undefined && { telefono: data.telefono }),
        ...(data.direccion !== undefined && { direccion: data.direccion }),
      },
    });
  }

  // DELETE /api/clientes/:id (soft delete)
  async eliminar(id: string) {
    const cliente = await prisma.cliente.findFirst({
      where: { id, deletedAt: null },
    });

    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }

    return prisma.cliente.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const clienteService = new ClienteService();
export default clienteService;
