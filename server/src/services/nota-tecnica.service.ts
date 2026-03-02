import prisma from '../config/database';

class NotaTecnicaService {
  // GET /api/ordenes-servicio/:ordenId/notas
  async listarPorOrden(ordenId: string) {
    const orden = await prisma.ordenServicio.findFirst({
      where: { id: ordenId, deletedAt: null },
    });
    if (!orden) throw new Error('Orden de servicio no encontrada');

    return prisma.notaTecnica.findMany({
      where: { ordenId },
      orderBy: { createdAt: 'asc' },
      include: {
        usuario: { select: { id: true, username: true, nombreCompleto: true } },
      },
    });
  }

  // POST /api/ordenes-servicio/:ordenId/notas
  async agregar(ordenId: string, usuarioId: string, contenido: string) {
    const orden = await prisma.ordenServicio.findFirst({
      where: { id: ordenId, deletedAt: null },
    });
    if (!orden) throw new Error('Orden de servicio no encontrada');

    if (orden.estado === 'CANCELADA') {
      throw new Error('No se pueden agregar notas a una orden cancelada');
    }

    return prisma.notaTecnica.create({
      data: { ordenId, usuarioId, contenido: contenido.trim() },
      include: {
        usuario: { select: { id: true, username: true, nombreCompleto: true } },
      },
    });
  }
}

export const notaTecnicaService = new NotaTecnicaService();
export default notaTecnicaService;
