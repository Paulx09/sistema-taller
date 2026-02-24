import prisma from '../config/database';
import { Prisma } from '@prisma/client';

interface CrearProveedorData {
  nombreEmpresa: string;
  ruc?: string;
  contactoNombre?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
}

interface ActualizarProveedorData {
  nombreEmpresa?: string;
  ruc?: string;
  contactoNombre?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
}

interface FiltrosProveedor {
  busqueda?: string;
  skip?: number;
  take?: number;
}

class ProveedorService {
  // GET /api/proveedores - Lista con búsqueda
  async listar(filtros: FiltrosProveedor = {}) {
    const { busqueda, skip = 0, take = 50 } = filtros;

    const where: Prisma.ProveedorWhereInput = {
      deletedAt: null,
      ...(busqueda
        ? {
            OR: [
              { nombreEmpresa: { contains: busqueda, mode: 'insensitive' } },
              { ruc: { contains: busqueda, mode: 'insensitive' } },
              { contactoNombre: { contains: busqueda, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [proveedores, total] = await Promise.all([
      prisma.proveedor.findMany({
        where,
        skip,
        take,
        orderBy: { nombreEmpresa: 'asc' },
        select: {
          id: true,
          nombreEmpresa: true,
          ruc: true,
          contactoNombre: true,
          telefono: true,
          email: true,
          direccion: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { compras: true },
          },
        },
      }),
      prisma.proveedor.count({ where }),
    ]);

    return { proveedores, total };
  }

  // GET /api/proveedores/:id
  async obtenerPorId(id: string) {
    const proveedor = await prisma.proveedor.findFirst({
      where: { id, deletedAt: null },
      include: {
        compras: {
          where: { deletedAt: null },
          orderBy: { fechaCompra: 'desc' },
          take: 10,
          select: {
            id: true,
            numeroFactura: true,
            fechaCompra: true,
            totalCompra: true,
          },
        },
        _count: {
          select: { compras: true },
        },
      },
    });

    if (!proveedor) {
      throw new Error('Proveedor no encontrado');
    }

    return proveedor;
  }

  // POST /api/proveedores
  async crear(data: CrearProveedorData) {
    // Validar RUC único si se proporciona
    if (data.ruc) {
      const existente = await prisma.proveedor.findFirst({
        where: { ruc: data.ruc, deletedAt: null },
      });

      if (existente) {
        throw new Error(`Ya existe un proveedor con el RUC ${data.ruc}`);
      }
    }

    const proveedor = await prisma.proveedor.create({
      data: {
        nombreEmpresa: data.nombreEmpresa,
        ruc: data.ruc,
        contactoNombre: data.contactoNombre,
        telefono: data.telefono,
        email: data.email,
        direccion: data.direccion,
      },
    });

    return proveedor;
  }

  // PUT /api/proveedores/:id
  async actualizar(id: string, data: ActualizarProveedorData) {
    // Verificar que existe
    const existente = await this.obtenerPorId(id);

    // Validar RUC único si se está cambiando
    if (data.ruc && data.ruc !== existente.ruc) {
      const duplicado = await prisma.proveedor.findFirst({
        where: { ruc: data.ruc, deletedAt: null, id: { not: id } },
      });

      if (duplicado) {
        throw new Error(`Ya existe otro proveedor con el RUC ${data.ruc}`);
      }
    }

    const proveedor = await prisma.proveedor.update({
      where: { id },
      data: {
        nombreEmpresa: data.nombreEmpresa,
        ruc: data.ruc,
        contactoNombre: data.contactoNombre,
        telefono: data.telefono,
        email: data.email,
        direccion: data.direccion,
      },
    });

    return proveedor;
  }

  // DELETE /api/proveedores/:id (SoftDelete)
  async eliminar(id: string) {
    // Verificar que existe
    await this.obtenerPorId(id);

    // Verificar que no tenga compras activas
    const comprasActivas = await prisma.compra.count({
      where: { proveedorId: id, deletedAt: null },
    });

    if (comprasActivas > 0) {
      throw new Error(
        `No se puede eliminar el proveedor porque tiene ${comprasActivas} compra(s) registrada(s)`
      );
    }

    const proveedor = await prisma.proveedor.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return proveedor;
  }
}

export default new ProveedorService();
