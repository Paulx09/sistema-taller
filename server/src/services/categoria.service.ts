import prisma from '../config/database';
import { Categoria } from '@prisma/client';

export class CategoriaService {
  // Listar todas las categorías (excluye eliminadas)
  async listarTodas(): Promise<Categoria[]> {
    return await prisma.categoria.findMany({
      where: { deletedAt: null },
      orderBy: { nombre: 'asc' }
    });
  }

  // Obtener una categoría por ID (solo si no está eliminada)
  async obtenerPorId(id: string): Promise<Categoria | null> {
    return await prisma.categoria.findFirst({
      where: { 
        id,
        deletedAt: null 
      },
      include: {
        productos: {
          where: { deletedAt: null },
          select: {
            id: true,
            nombre: true,
            precioVenta: true,
            stockActual: true
          }
        }
      }
    });
  }

  // Crear nueva categoría
  async crear(data: { nombre: string }): Promise<Categoria> {
    return await prisma.categoria.create({
      data
    });
  }

  // Actualizar categoría
  async actualizar(id: string, data: { nombre: string }): Promise<Categoria> {
    return await prisma.categoria.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  }

  // Eliminar categoría (soft delete)
  async eliminar(id: string): Promise<Categoria> {
    // Verificar si tiene productos asignados activos
    const productosAsignados = await prisma.producto.count({
      where: { 
        categoriaId: id,
        deletedAt: null
      }
    });

    if (productosAsignados > 0) {
      throw new Error(`No se puede eliminar la categoría porque tiene ${productosAsignados} producto(s) asignado(s)`);
    }

    // Soft delete
    return await prisma.categoria.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        updatedAt: new Date()
      }
    });
  }
}

export default new CategoriaService();
