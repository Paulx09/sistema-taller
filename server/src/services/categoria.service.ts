import prisma from '../config/database';
import { Categoria } from '@prisma/client';

export class CategoriaService {
  // Listar todas las categorías
  async listarTodas(): Promise<Categoria[]> {
    return await prisma.categoria.findMany({
      orderBy: { nombre: 'asc' }
    });
  }

  // Obtener una categoría por ID
  async obtenerPorId(id: number): Promise<Categoria | null> {
    return await prisma.categoria.findUnique({
      where: { id },
      include: {
        productos: {
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
  async actualizar(id: number, data: { nombre: string }): Promise<Categoria> {
    return await prisma.categoria.update({
      where: { id },
      data
    });
  }

  // Eliminar categoría
  async eliminar(id: number): Promise<Categoria> {
    // Verificar si tiene productos asignados
    const productosAsignados = await prisma.producto.count({
      where: { categoriaId: id }
    });

    if (productosAsignados > 0) {
      throw new Error(`No se puede eliminar la categoría porque tiene ${productosAsignados} producto(s) asignado(s)`);
    }

    return await prisma.categoria.delete({
      where: { id }
    });
  }
}

export default new CategoriaService();
