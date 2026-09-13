import prisma from '../config/database';
import { Marca } from '@prisma/client';

interface FiltrosMarcas {
  busqueda?: string;
  skip?: number;
  take?: number;
}

export class MarcaService {
  // Listar todas las marcas (excluye eliminadas) con búsqueda y paginación
  async listarTodas(filtros: FiltrosMarcas = {}) {
    const { busqueda, skip = 0, take = 100 } = filtros;

    const where = {
      deletedAt: null,
      ...(busqueda && {
        nombre: { contains: busqueda, mode: 'insensitive' as const },
      }),
    };

    const [marcas, total] = await Promise.all([
      prisma.marca.findMany({
        where,
        orderBy: { nombre: 'asc' },
        skip,
        take,
      }),
      prisma.marca.count({ where }),
    ]);

    return { marcas, total };
  }

  // Obtener una marca por ID
  async obtenerPorId(id: string): Promise<Marca | null> {
    return await prisma.marca.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        productos: {
          where: { deletedAt: null },
          select: {
            id: true,
            nombre: true,
            precioVenta: true,
            stockActual: true,
          },
        },
      },
    });
  }

  // Crear nueva marca
  async crear(data: { nombre: string }): Promise<Marca> {
    const nombreNormalizado = data.nombre.trim();
    // Verificar si ya existe una marca activa con este nombre
    const existente = await prisma.marca.findFirst({
      where: {
        nombre: { equals: nombreNormalizado, mode: 'insensitive' },
        deletedAt: null,
      },
    });

    if (existente) {
      throw new Error('Ya existe una marca con ese nombre');
    }

    return await prisma.marca.create({
      data: {
        nombre: nombreNormalizado,
      },
    });
  }

  // Actualizar marca
  async actualizar(id: string, data: { nombre: string }): Promise<Marca> {
    const nombreNormalizado = data.nombre.trim();
    const existente = await prisma.marca.findFirst({
      where: {
        nombre: { equals: nombreNormalizado, mode: 'insensitive' },
        id: { not: id },
        deletedAt: null,
      },
    });

    if (existente) {
      throw new Error('Ya existe otra marca con ese nombre');
    }

    return await prisma.marca.update({
      where: { id },
      data: {
        nombre: nombreNormalizado,
        updatedAt: new Date(),
      },
    });
  }

  // Eliminar marca (soft delete)
  async eliminar(id: string): Promise<Marca> {
    const marca = await prisma.marca.findFirst({
      where: { id, deletedAt: null },
    });
    if (!marca) {
      throw new Error('Marca no encontrada');
    }

    const [productosAsignados, equiposAsignados] = await Promise.all([
      prisma.producto.count({
        where: {
          deletedAt: null,
          OR: [
            { marcaId: id },
            { marca: { equals: marca.nombre, mode: 'insensitive' } },
          ],
        },
      }),
      prisma.equipoCliente.count({
        where: {
          OR: [
            { marcaId: id },
            { marca: { equals: marca.nombre, mode: 'insensitive' } },
          ],
        },
      }),
    ]);

    if (productosAsignados > 0 || equiposAsignados > 0) {
      const motivos: string[] = [];
      if (productosAsignados > 0) motivos.push(`${productosAsignados} producto(s) en inventario`);
      if (equiposAsignados > 0) motivos.push(`${equiposAsignados} equipo(s) en órdenes`);
      throw new Error(
        `No se puede eliminar la marca "${marca.nombre}" porque tiene ${motivos.join(' y ')} asociado(s).`
      );
    }

    return await prisma.marca.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}

export default new MarcaService();
