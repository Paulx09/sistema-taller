import prisma from '../config/database';
import { Producto, Prisma } from '@prisma/client';

interface CrearProductoData {
  nombre: string;
  marca?: string;
  modelo?: string;
  sku?: string;
  codigoBarras?: string;
  descripcion?: string;
  categoriaId: string;
  ubicacionId?: string;
  precioCompra: number;
  precioVenta: number;
  stockActual?: number;
  stockMinimo?: number;
  imagenUrl?: string;
  specs?: Record<string, any>;
  esServicio?: boolean;
  esSegundaMano?: boolean;
  padreId?: string;
}

interface ActualizarProductoData {
  nombre?: string;
  marca?: string;
  modelo?: string;
  sku?: string;
  codigoBarras?: string;
  descripcion?: string;
  categoriaId?: string;
  ubicacionId?: string;
  precioCompra?: number;
  precioVenta?: number;
  stockMinimo?: number;
  imagenUrl?: string;
  specs?: Record<string, any>;
  esServicio?: boolean;
  esSegundaMano?: boolean;
  padreId?: string;
}

interface FiltrosProducto {
  busqueda?: string;
  categoriaId?: string;
  esServicio?: boolean;
  bajoStock?: boolean;
  skip?: number;
  take?: number;
}

export class ProductoService {
  // Listar productos con filtros y paginación
  async listar(filtros: FiltrosProducto = {}) {
    const { busqueda, categoriaId, esServicio, bajoStock, skip = 0, take = 50 } = filtros;

    const where: Prisma.ProductoWhereInput = {
      deletedAt: null,
      ...(busqueda && {
        OR: [
          { nombre: { contains: busqueda, mode: 'insensitive' } },
          { marca: { contains: busqueda, mode: 'insensitive' } },
          { modelo: { contains: busqueda, mode: 'insensitive' } },
          { sku: { contains: busqueda, mode: 'insensitive' } },
        ],
      }),
      ...(categoriaId && { categoriaId }),
      ...(esServicio !== undefined && { esServicio }),
      ...(bajoStock && {
        stockActual: { lte: prisma.producto.fields.stockMinimo },
      }),
    };

    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        where,
        include: {
          categoria: { select: { id: true, nombre: true } },
          ubicacion: { select: { id: true, nombre: true } },
          padre: { select: { id: true, nombre: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.producto.count({ where }),
    ]);

    return { productos, total };
  }

  // AJUSTE CRÍTICO: Búsqueda para combobox (excluye producto actual)
  async buscarParaCombobox(query: string, excludeId?: string) {
    return await prisma.producto.findMany({
      where: {
        deletedAt: null,
        esServicio: false, // Solo productos físicos pueden ser padres
        ...(excludeId && { id: { not: excludeId } }), // Excluir el producto actual
        nombre: { contains: query, mode: 'insensitive' },
      },
      select: {
        id: true,
        nombre: true,
        marca: true,
        modelo: true,
        stockActual: true,
      },
      take: 10,
      orderBy: { nombre: 'asc' },
    });
  }

  // Productos con bajo stock
  async obtenerBajoStock() {
    return await prisma.producto.findMany({
      where: {
        deletedAt: null,
        esServicio: false, // Los servicios no tienen stock
        stockActual: { lte: prisma.producto.fields.stockMinimo },
      },
      include: {
        categoria: { select: { nombre: true } },
        ubicacion: { select: { nombre: true } },
      },
      orderBy: { stockActual: 'asc' },
    });
  }

  // Productos sin movimiento en X días
  async obtenerSinMovimiento(dias: number = 90) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - dias);

    const productos = await prisma.producto.findMany({
      where: {
        deletedAt: null,
        esServicio: false, // Excluir servicios, solo productos físicos
        detalleVentas: {
          none: {
            createdAt: { gte: fechaLimite },
          },
        },
      },
      include: {
        categoria: { select: { nombre: true } },
        detalleVentas: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calcular días sin movimiento para cada producto y filtrar por el criterio
    const hoy = new Date();
    const productosConDias = productos.map((producto) => {
      const ultimaVenta = producto.detalleVentas[0]?.createdAt || producto.createdAt;
      const diasSinMovimiento = Math.floor(
        (hoy.getTime() - new Date(ultimaVenta).getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: producto.id,
        nombre: producto.nombre,
        stockActual: producto.stockActual,
        categoria: producto.categoria,
        ultimaVenta: producto.detalleVentas[0]?.createdAt || null,
        diasSinMovimiento,
      };
    });

    // Filtrar solo productos con días >= criterio seleccionado
    return productosConDias.filter((p) => p.diasSinMovimiento >= dias);
  }

  // Obtener por ID
  async obtenerPorId(id: string): Promise<Producto | null> {
    return await prisma.producto.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        categoria: true,
        ubicacion: true,
        padre: { select: { id: true, nombre: true } },
        hijos: {
          where: { deletedAt: null },
          select: { id: true, nombre: true, stockActual: true },
        },
        movimientos: {
          include: {
            usuario: { select: { nombreCompleto: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  // AJUSTE CRÍTICO: Crear con MovimientoStock automático
  async crear(data: CrearProductoData, usuarioId: string): Promise<Producto> {
    const producto = await prisma.producto.create({
      data: {
        nombre: data.nombre,
        marca: data.marca,
        modelo: data.modelo,
        sku: data.sku,
        codigoBarras: data.codigoBarras,
        descripcion: data.descripcion,
        categoriaId: data.categoriaId,
        ubicacionId: data.ubicacionId,
        precioCompra: new Prisma.Decimal(data.precioCompra),
        precioVenta: new Prisma.Decimal(data.precioVenta),
        stockActual: data.stockActual ?? 0,
        stockMinimo: data.stockMinimo ?? 1,
        imagenUrl: data.imagenUrl,
        specs: data.specs,
        esServicio: data.esServicio ?? false,
        esSegundaMano: data.esSegundaMano ?? false,
        padreId: data.padreId,
      },
    });

    // Si tiene stock inicial > 0, registrar movimiento automático
    if (producto.stockActual > 0 && !producto.esServicio) {
      await prisma.movimientoStock.create({
        data: {
          productoId: producto.id,
          usuarioId,
          tipo: 'INVENTARIO_INICIAL',
          cantidad: producto.stockActual,
          motivo: 'Stock inicial al crear producto',
        },
      });
    }

    return producto;
  }

  // Actualizar producto
  async actualizar(id: string, data: ActualizarProductoData): Promise<Producto> {
    return await prisma.producto.update({
      where: { id },
      data: {
        ...data,
        ...(data.precioCompra && { precioCompra: new Prisma.Decimal(data.precioCompra) }),
        ...(data.precioVenta && { precioVenta: new Prisma.Decimal(data.precioVenta) }),
        updatedAt: new Date(),
      },
    });
  }

  // Ajuste manual de stock (con trazabilidad)
  async ajustarStock(
    id: string,
    cantidad: number,
    tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE',
    motivo: string,
    usuarioId: string
  ): Promise<Producto> {
    const producto = await prisma.producto.findUnique({ where: { id } });

    if (!producto) {
      throw new Error('Producto no encontrado');
    }

    if (producto.esServicio) {
      throw new Error('No se puede ajustar stock de un servicio');
    }

    // Calcular nuevo stock según tipo de movimiento
    let nuevoStock: number;
    if (tipo === 'ENTRADA') {
      nuevoStock = producto.stockActual + cantidad;
    } else if (tipo === 'SALIDA') {
      nuevoStock = producto.stockActual - cantidad;
    } else {
      nuevoStock = cantidad; // AJUSTE directo
    }

    if (nuevoStock < 0) {
      throw new Error('Stock no puede ser negativo');
    }

    // Actualizar stock y registrar movimiento en transacción
    const [productoActualizado] = await prisma.$transaction([
      prisma.producto.update({
        where: { id },
        data: { stockActual: nuevoStock, updatedAt: new Date() },
      }),
      prisma.movimientoStock.create({
        data: {
          productoId: id,
          usuarioId,
          tipo,
          cantidad,
          motivo,
        },
      }),
    ]);

    return productoActualizado;
  }

  // Soft delete
  async eliminar(id: string): Promise<Producto> {
    // Verificar si tiene hijos asignados
    const hijos = await prisma.producto.count({
      where: { padreId: id, deletedAt: null },
    });

    if (hijos > 0) {
      throw new Error(`No se puede eliminar el producto porque tiene ${hijos} componente(s) asignado(s)`);
    }

    // Soft delete
    return await prisma.producto.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}

export default new ProductoService();
