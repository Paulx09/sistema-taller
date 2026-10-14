import prisma from '../config/database';
import { Categoria, TipoItem } from '@prisma/client';

interface FiltrosCategorias {
  tipo?: TipoItem;
  skip?: number;
  take?: number;
}

export class CategoriaService {
  // Listar todas las categorías (excluye eliminadas) con paginación y filtro opcional por tipo
  async listarTodas(filtros: FiltrosCategorias = {}) {
    const { tipo, skip = 0, take = 50 } = filtros;

    const where = {
      deletedAt: null,
      ...(tipo && { tipo }),
    };

    const [categorias, total] = await Promise.all([
      prisma.categoria.findMany({
        where,
        orderBy: { nombre: 'asc' },
        skip,
        take,
      }),
      prisma.categoria.count({
        where,
      }),
    ]);

    return { categorias, total };
  }

  // Obtener una categoría por ID (solo si no está eliminada)
  async obtenerPorId(id: string): Promise<Categoria | null> {
    return await prisma.categoria.findFirst({
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
            tipo: true,
            precioVenta: true,
            stockActual: true,
          },
        },
      },
    });
  }

  // Crear nueva categoría (o restaurar si estaba eliminada)
  async crear(data: { nombre: string; tipo?: TipoItem }): Promise<Categoria> {
    const nombreNormalizado = data.nombre.toUpperCase().trim();
    const tipo = data.tipo || 'PRODUCTO';

    // Verificar si ya existe una categoría con ese nombre y tipo (incluyendo eliminadas)
    const existente = await prisma.categoria.findFirst({
      where: {
        nombre: nombreNormalizado,
        tipo,
      },
    });

    if (existente) {
      if (existente.deletedAt) {
        // Restaurar si estaba eliminada
        return await prisma.categoria.update({
          where: { id: existente.id },
          data: {
            deletedAt: null,
            updatedAt: new Date(),
          },
        });
      }
      throw new Error('Ya existe una categoría con ese nombre y tipo');
    }

    return await prisma.categoria.create({
      data: {
        nombre: nombreNormalizado,
        tipo,
      },
    });
  }

  // Actualizar categoría
  async actualizar(id: string, data: { nombre?: string; tipo?: TipoItem }): Promise<Categoria> {
    const categoriaActual = await prisma.categoria.findFirst({
      where: { id, deletedAt: null },
    });

    if (!categoriaActual) {
      throw new Error('Categoría no encontrada');
    }

    const nuevoNombre = data.nombre ? data.nombre.toUpperCase().trim() : categoriaActual.nombre;
    const nuevoTipo = data.tipo || categoriaActual.tipo;

    // Si cambió nombre o tipo, verificar colisión con otra categoría
    if (nuevoNombre !== categoriaActual.nombre || nuevoTipo !== categoriaActual.tipo) {
      const duplicada = await prisma.categoria.findFirst({
        where: {
          nombre: nuevoNombre,
          tipo: nuevoTipo,
          id: { not: id },
        },
      });

      if (duplicada) {
        if (duplicada.deletedAt) {
          throw new Error('Ya existe una categoría eliminada con ese nombre y tipo. Créala para reactivarla.');
        }
        throw new Error('Ya existe una categoría con ese nombre y tipo');
      }
    }

    return await prisma.categoria.update({
      where: { id },
      data: {
        ...(data.nombre && { nombre: nuevoNombre }),
        ...(data.tipo && { tipo: nuevoTipo }),
        updatedAt: new Date(),
      },
    });
  }

  // Eliminar categoría (soft delete)
  async eliminar(id: string): Promise<Categoria> {
    // Verificar si tiene productos asignados activos
    const productosAsignados = await prisma.producto.count({
      where: { 
        categoriaId: id,
        deletedAt: null,
      },
    });

    if (productosAsignados > 0) {
      throw new Error(`No se puede eliminar la categoría porque tiene ${productosAsignados} producto(s) asignado(s)`);
    }

    // Soft delete
    return await prisma.categoria.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}

export default new CategoriaService();
