import prisma from '../config/database';
import { Ubicacion } from '@prisma/client';

interface FiltrosUbicaciones {
  skip?: number;
  take?: number;
}

export class UbicacionService {
  // Listar todas las ubicaciones (excluye eliminadas) con paginación
  async listarTodas(filtros: FiltrosUbicaciones = {}) {
    const { skip = 0, take = 50 } = filtros;

    const [ubicaciones, total] = await Promise.all([
      prisma.ubicacion.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        skip,
        take
      }),
      prisma.ubicacion.count({
        where: { deletedAt: null }
      })
    ]);

    return { ubicaciones, total };
  }

  // Obtener una ubicación por ID (solo si no está eliminada)
  async obtenerPorId(id: string): Promise<Ubicacion | null> {
    return await prisma.ubicacion.findFirst({
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
            stockActual: true
          }
        }
      }
    });
  }

  // Crear nueva ubicación
  async crear(data: { nombre: string; descripcion?: string }): Promise<Ubicacion> {
    return await prisma.ubicacion.create({
      data
    });
  }

  // Actualizar ubicación
  async actualizar(id: string, data: { nombre?: string; descripcion?: string }): Promise<Ubicacion> {
    return await prisma.ubicacion.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  }

  // Eliminar ubicación (soft delete)
  async eliminar(id: string): Promise<Ubicacion> {
    // Verificar si tiene productos asignados activos
    const productosAsignados = await prisma.producto.count({
      where: { 
        ubicacionId: id,
        deletedAt: null
      }
    });

    if (productosAsignados > 0) {
      throw new Error(`No se puede eliminar la ubicación porque tiene ${productosAsignados} producto(s) asignado(s)`);
    }

    // Soft delete
    return await prisma.ubicacion.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        updatedAt: new Date()
      }
    });
  }
}

export default new UbicacionService();
