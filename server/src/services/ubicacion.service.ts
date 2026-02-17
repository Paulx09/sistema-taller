import prisma from '../config/database';
import { Ubicacion } from '@prisma/client';

export class UbicacionService {
  // Listar todas las ubicaciones
  async listarTodas(): Promise<Ubicacion[]> {
    return await prisma.ubicacion.findMany({
      orderBy: { id: 'asc' }
    });
  }

  // Obtener una ubicación por ID
  async obtenerPorId(id: number): Promise<Ubicacion | null> {
    return await prisma.ubicacion.findUnique({
      where: { id },
      include: {
        productos: {
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
  async actualizar(id: number, data: { nombre?: string; descripcion?: string }): Promise<Ubicacion> {
    return await prisma.ubicacion.update({
      where: { id },
      data
    });
  }

  // Eliminar ubicación
  async eliminar(id: number): Promise<Ubicacion> {
    // Verificar si tiene productos asignados
    const productosAsignados = await prisma.producto.count({
      where: { ubicacionId: id }
    });

    if (productosAsignados > 0) {
      throw new Error(`No se puede eliminar la ubicación porque tiene ${productosAsignados} producto(s) asignado(s)`);
    }

    return await prisma.ubicacion.delete({
      where: { id }
    });
  }
}

export default new UbicacionService();
