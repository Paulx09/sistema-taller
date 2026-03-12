import prisma from '../config/database';

class NotaTecnicaService {
  // GET /api/ordenes-servicio/:ordenId/equipos/:equipoOrdenId/notas
  async listarPorEquipoOrden(ordenId: string, equipoOrdenId: string) {
    const equipoOrden = await prisma.equipoOrden.findFirst({
      where: { id: equipoOrdenId, ordenId, orden: { deletedAt: null } },
    });
    if (!equipoOrden) throw new Error('Equipo no encontrado en esta orden');

    return prisma.notaTecnica.findMany({
      where: { equipoOrdenId },
      orderBy: { createdAt: 'asc' },
      include: {
        usuario: { select: { id: true, username: true, nombreCompleto: true } },
      },
    });
  }

  // POST /api/ordenes-servicio/:ordenId/equipos/:equipoOrdenId/notas
  async agregar(ordenId: string, equipoOrdenId: string, usuarioId: string, contenido: string) {
    const equipoOrden = await prisma.equipoOrden.findFirst({
      where: { id: equipoOrdenId, ordenId, orden: { deletedAt: null } },
    });
    if (!equipoOrden) throw new Error('Equipo no encontrado en esta orden');

    if (equipoOrden.estado === 'CANCELADA') {
      throw new Error('No se pueden agregar notas a un equipo cancelado');
    }

    return prisma.notaTecnica.create({
      data: { equipoOrdenId, usuarioId, contenido: contenido.trim() },
      include: {
        usuario: { select: { id: true, username: true, nombreCompleto: true } },
      },
    });
  }
}

export const notaTecnicaService = new NotaTecnicaService();
export default notaTecnicaService;
