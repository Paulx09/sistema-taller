import prisma from '../config/database';

interface CrearEquipoData {
  tipoEquipo: string;
  marca?: string | null;
  modelo?: string | null;
  numeroSerie?: string | null;
  contrasenaPatron?: string | null;
}

interface ActualizarEquipoData {
  tipoEquipo?: string;
  marca?: string | null;
  modelo?: string | null;
  numeroSerie?: string | null;
  contrasenaPatron?: string | null;
}

class EquipoClienteService {
  // GET /api/clientes/:clienteId/equipos
  async listarPorCliente(clienteId: string) {
    const cliente = await prisma.cliente.findFirst({
      where: { id: clienteId, deletedAt: null },
    });

    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }

    return prisma.equipoCliente.findMany({
      where: { clienteId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tipoEquipo: true,
        marca: true,
        modelo: true,
        numeroSerie: true,
        // contrasenaPatron excluida por defecto
        createdAt: true,
        updatedAt: true,
        _count: { select: { ordenes: true } },
      },
    });
  }

  // GET por id con contraseña (para endpoint de revelar)
  async obtenerPorId(id: string, incluirContrasena = false) {
    const equipo = await prisma.equipoCliente.findFirst({
      where: { id },
      select: {
        id: true,
        clienteId: true,
        tipoEquipo: true,
        marca: true,
        modelo: true,
        numeroSerie: true,
        contrasenaPatron: incluirContrasena,
        createdAt: true,
        updatedAt: true,
        cliente: {
          select: { id: true, nombre: true },
        },
      },
    });

    if (!equipo) {
      throw new Error('Equipo no encontrado');
    }

    return equipo;
  }

  // POST /api/clientes/:clienteId/equipos
  async crear(clienteId: string, data: CrearEquipoData) {
    const cliente = await prisma.cliente.findFirst({
      where: { id: clienteId, deletedAt: null },
    });

    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }

    return prisma.equipoCliente.create({
      data: {
        clienteId,
        tipoEquipo: data.tipoEquipo,
        marca: data.marca ?? null,
        modelo: data.modelo ?? null,
        numeroSerie: data.numeroSerie ?? null,
        contrasenaPatron: data.contrasenaPatron ?? null,
      },
      select: {
        id: true,
        clienteId: true,
        tipoEquipo: true,
        marca: true,
        modelo: true,
        numeroSerie: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // PUT /api/equipos/:id
  async actualizar(id: string, data: ActualizarEquipoData) {
    const equipo = await prisma.equipoCliente.findFirst({
      where: { id },
    });

    if (!equipo) {
      throw new Error('Equipo no encontrado');
    }

    return prisma.equipoCliente.update({
      where: { id },
      data: {
        ...(data.tipoEquipo !== undefined && { tipoEquipo: data.tipoEquipo }),
        ...(data.marca !== undefined && { marca: data.marca }),
        ...(data.modelo !== undefined && { modelo: data.modelo }),
        ...(data.numeroSerie !== undefined && { numeroSerie: data.numeroSerie }),
        ...(data.contrasenaPatron !== undefined && { contrasenaPatron: data.contrasenaPatron }),
      },
      select: {
        id: true,
        clienteId: true,
        tipoEquipo: true,
        marca: true,
        modelo: true,
        numeroSerie: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // DELETE /api/equipos/:id
  async eliminar(id: string) {
    const equipo = await prisma.equipoCliente.findFirst({
      where: { id },
      include: { _count: { select: { ordenes: true } } },
    });

    if (!equipo) {
      throw new Error('Equipo no encontrado');
    }

    if (equipo._count.ordenes > 0) {
      throw new Error('No se puede eliminar el equipo porque tiene órdenes de servicio asociadas');
    }

    return prisma.equipoCliente.delete({ where: { id } });
  }
}

export const equipoClienteService = new EquipoClienteService();
export default equipoClienteService;
