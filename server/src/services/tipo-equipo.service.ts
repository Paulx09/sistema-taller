import prisma from '../config/database';
import { TipoEquipo } from '@prisma/client';

const DEFAULT_TIPOS = [
  { nombre: 'Laptop', requiereClave: true },
  { nombre: 'PC', requiereClave: false },
  { nombre: 'Tablet', requiereClave: true },
  { nombre: 'Celular', requiereClave: true },
  { nombre: 'Impresora', requiereClave: false },
  { nombre: 'Consola', requiereClave: false },
];

interface FiltrosTiposEquipo {
  busqueda?: string;
  activo?: boolean;
  skip?: number;
  take?: number;
}

export class TipoEquipoService {
  // Asegurar que existan los tipos por defecto
  async asegurarTiposPorDefecto(): Promise<void> {
    const count = await prisma.tipoEquipo.count();
    if (count === 0) {
      for (const item of DEFAULT_TIPOS) {
        await prisma.tipoEquipo.create({
          data: item,
        });
      }
    }
  }

  // Listar tipos de equipo
  async listarTodos(filtros: FiltrosTiposEquipo = {}) {
    await this.asegurarTiposPorDefecto();

    const { busqueda, activo, skip = 0, take = 100 } = filtros;

    const where: any = {
      deletedAt: null,
    };

    if (activo !== undefined) {
      where.activo = activo;
    }

    if (busqueda) {
      where.nombre = {
        contains: busqueda,
        mode: 'insensitive' as const,
      };
    }

    const [tiposEquipo, total] = await Promise.all([
      prisma.tipoEquipo.findMany({
        where,
        orderBy: { nombre: 'asc' },
        skip,
        take,
        include: {
          _count: {
            select: { equipos: true },
          },
        },
      }),
      prisma.tipoEquipo.count({ where }),
    ]);

    return { tiposEquipo, total };
  }

  // Obtener por ID
  async obtenerPorId(id: string): Promise<TipoEquipo | null> {
    return prisma.tipoEquipo.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: { equipos: true },
        },
      },
    });
  }

  // Crear tipo de equipo
  async crear(data: { nombre: string; requiereClave?: boolean }): Promise<TipoEquipo> {
    const nombreNormalizado = data.nombre.trim();

    // Verificar si ya existe (incluyendo soft-deleted)
    const existente = await prisma.tipoEquipo.findFirst({
      where: {
        nombre: { equals: nombreNormalizado, mode: 'insensitive' },
      },
    });

    if (existente) {
      if (existente.deletedAt) {
        // Restaurar si estaba eliminado
        return prisma.tipoEquipo.update({
          where: { id: existente.id },
          data: {
            deletedAt: null,
            activo: true,
            requiereClave: data.requiereClave ?? existente.requiereClave,
          },
        });
      }
      throw new Error('Ya existe un tipo de equipo con ese nombre');
    }

    return prisma.tipoEquipo.create({
      data: {
        nombre: nombreNormalizado,
        requiereClave: data.requiereClave ?? false,
      },
    });
  }

  // Actualizar tipo de equipo
  async actualizar(id: string, data: { nombre?: string; requiereClave?: boolean; activo?: boolean }): Promise<TipoEquipo> {
    const tipo = await this.obtenerPorId(id);
    if (!tipo) {
      throw new Error('Tipo de equipo no encontrado');
    }

    if (data.nombre) {
      const nombreNormalizado = data.nombre.trim();
      const existente = await prisma.tipoEquipo.findFirst({
        where: {
          nombre: { equals: nombreNormalizado, mode: 'insensitive' },
          id: { not: id },
          deletedAt: null,
        },
      });

      if (existente) {
        throw new Error('Ya existe otro tipo de equipo con ese nombre');
      }
    }

    return prisma.tipoEquipo.update({
      where: { id },
      data: {
        ...(data.nombre && { nombre: data.nombre.trim() }),
        ...(data.requiereClave !== undefined && { requiereClave: data.requiereClave }),
        ...(data.activo !== undefined && { activo: data.activo }),
      },
    });
  }

  // Eliminar tipo de equipo (soft delete)
  async eliminar(id: string): Promise<TipoEquipo> {
    const tipo = await this.obtenerPorId(id);
    if (!tipo) {
      throw new Error('Tipo de equipo no encontrado');
    }

    // Verificar si tiene equipos asignados (por ID o por nombre histórico)
    const equiposAsignados = await prisma.equipoCliente.count({
      where: {
        OR: [
          { tipoEquipoId: id },
          { tipoEquipo: { equals: tipo.nombre, mode: 'insensitive' } },
        ],
      },
    });

    if (equiposAsignados > 0) {
      throw new Error(`No se puede eliminar el tipo de equipo "${tipo.nombre}" porque está asignado a ${equiposAsignados} equipo(s) en órdenes de servicio.`);
    }

    return prisma.tipoEquipo.update({
      where: { id },
      data: { deletedAt: new Date(), activo: false },
    });
  }
}

export default new TipoEquipoService();
