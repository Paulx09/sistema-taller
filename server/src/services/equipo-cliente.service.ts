import prisma from '../config/database';

interface CrearEquipoData {
  tipoEquipoId?: string | null;
  tipoEquipo?: string;
  marcaId?: string | null;
  marca?: string | null;
  modelo?: string | null;
  numeroSerie?: string | null;
  contrasenaPatron?: string | null;
}

interface ActualizarEquipoData {
  tipoEquipoId?: string | null;
  tipoEquipo?: string;
  marcaId?: string | null;
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
        tipoEquipoId: true,
        tipoEquipo: true,
        tipoEquipoRel: {
          select: { id: true, nombre: true, requiereClave: true },
        },
        marcaId: true,
        marca: true,
        marcaRel: {
          select: { id: true, nombre: true },
        },
        modelo: true,
        numeroSerie: true,
        // contrasenaPatron excluida por defecto
        createdAt: true,
        updatedAt: true,
        _count: { select: { equiposOrdenes: true } },
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
        tipoEquipoId: true,
        tipoEquipo: true,
        tipoEquipoRel: {
          select: { id: true, nombre: true, requiereClave: true },
        },
        marcaId: true,
        marca: true,
        marcaRel: {
          select: { id: true, nombre: true },
        },
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

    // Resolver nombre de tipo si se pasa tipoEquipoId
    let tipoNombre = data.tipoEquipo || '';
    if (data.tipoEquipoId) {
      const tipoObj = await prisma.tipoEquipo.findUnique({ where: { id: data.tipoEquipoId } });
      if (tipoObj) tipoNombre = tipoObj.nombre;
    }

    // Resolver nombre de marca si se pasa marcaId
    let marcaNombre = data.marca ?? null;
    if (data.marcaId) {
      const marcaObj = await prisma.marca.findUnique({ where: { id: data.marcaId } });
      if (marcaObj) marcaNombre = marcaObj.nombre;
    }

    return prisma.equipoCliente.create({
      data: {
        clienteId,
        tipoEquipoId: data.tipoEquipoId ?? null,
        tipoEquipo: tipoNombre,
        marcaId: data.marcaId ?? null,
        marca: marcaNombre,
        modelo: data.modelo ?? null,
        numeroSerie: data.numeroSerie ?? null,
        contrasenaPatron: data.contrasenaPatron ?? null,
      },
      select: {
        id: true,
        clienteId: true,
        tipoEquipoId: true,
        tipoEquipo: true,
        tipoEquipoRel: {
          select: { id: true, nombre: true, requiereClave: true },
        },
        marcaId: true,
        marca: true,
        marcaRel: {
          select: { id: true, nombre: true },
        },
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

    let tipoNombre = data.tipoEquipo;
    if (data.tipoEquipoId) {
      const tipoObj = await prisma.tipoEquipo.findUnique({ where: { id: data.tipoEquipoId } });
      if (tipoObj) tipoNombre = tipoObj.nombre;
    }

    let marcaNombre = data.marca;
    if (data.marcaId) {
      const marcaObj = await prisma.marca.findUnique({ where: { id: data.marcaId } });
      if (marcaObj) marcaNombre = marcaObj.nombre;
    }

    return prisma.equipoCliente.update({
      where: { id },
      data: {
        ...(data.tipoEquipoId !== undefined && { tipoEquipoId: data.tipoEquipoId }),
        ...(tipoNombre !== undefined && { tipoEquipo: tipoNombre }),
        ...(data.marcaId !== undefined && { marcaId: data.marcaId }),
        ...(marcaNombre !== undefined && { marca: marcaNombre }),
        ...(data.modelo !== undefined && { modelo: data.modelo }),
        ...(data.numeroSerie !== undefined && { numeroSerie: data.numeroSerie }),
        ...(data.contrasenaPatron !== undefined && { contrasenaPatron: data.contrasenaPatron }),
      },
      select: {
        id: true,
        clienteId: true,
        tipoEquipoId: true,
        tipoEquipo: true,
        tipoEquipoRel: {
          select: { id: true, nombre: true, requiereClave: true },
        },
        marcaId: true,
        marca: true,
        marcaRel: {
          select: { id: true, nombre: true },
        },
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
      include: { _count: { select: { equiposOrdenes: true } } },
    });

    if (!equipo) {
      throw new Error('Equipo no encontrado');
    }

    if (equipo._count.equiposOrdenes > 0) {
      throw new Error('No se puede eliminar el equipo porque tiene órdenes de servicio asociadas');
    }

    return prisma.equipoCliente.delete({ where: { id } });
  }
}

export const equipoClienteService = new EquipoClienteService();
export default equipoClienteService;
