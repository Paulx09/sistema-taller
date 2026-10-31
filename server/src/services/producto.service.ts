import prisma from '../config/database';
import { Producto, Prisma, TipoItem } from '@prisma/client';

interface CrearProductoData {
  tipo?: TipoItem;
  nombre?: string;
  marca?: string;
  marcaId?: string;
  modelo?: string;
  sku?: string;
  codigoBarras?: string;
  descripcion?: string;
  categoriaId: string;
  ubicacionId?: string;
  precioCompra?: number;
  precioVenta: number;
  margenReferencia?: number;
  stockActual?: number;
  stockMinimo?: number;
  imagenUrl?: string;
  specs?: Record<string, any>;
  esServicio?: boolean;
  esSegundaMano?: boolean;
  preciosPendientes?: boolean;
  padreId?: string;
  requiereSerie?: boolean;
  garantiaProveedorMeses?: number;
  garantiaClienteMeses?: number;
}

interface ActualizarProductoData {
  tipo?: TipoItem;
  nombre?: string;
  marca?: string;
  marcaId?: string;
  modelo?: string;
  sku?: string;
  codigoBarras?: string;
  descripcion?: string;
  categoriaId?: string;
  ubicacionId?: string;
  precioCompra?: number;
  precioVenta?: number;
  margenReferencia?: number;
  stockMinimo?: number;
  imagenUrl?: string;
  specs?: Record<string, any>;
  esServicio?: boolean;
  esSegundaMano?: boolean;
  padreId?: string;
  requiereSerie?: boolean;
  garantiaProveedorMeses?: number;
  garantiaClienteMeses?: number;
}

interface FiltrosProducto {
  busqueda?: string;
  tipo?: TipoItem;
  categoriaId?: string;
  marcaId?: string;
  esServicio?: boolean;
  bajoStock?: boolean;
  preciosPendientes?: boolean;
  skip?: number;
  take?: number;
}

export class ProductoService {
  // Helper para autogenerar nombre comercial a partir de Categoría + Modelo (o solo Categoría para Servicios)
  private async generarNombreProducto(data: {
    tipo?: TipoItem;
    nombre?: string;
    categoriaId?: string;
    modelo?: string;
  }): Promise<string> {
    let categoriaNombre = '';
    if (data.categoriaId) {
      const cat = await prisma.categoria.findUnique({
        where: { id: data.categoriaId },
        select: { nombre: true, tipo: true },
      });
      categoriaNombre = cat?.nombre ? cat.nombre.trim().toUpperCase() : '';
    }

    const isService = data.tipo === 'SERVICIO';
    const modelo = data.modelo?.trim().toUpperCase() || '';

    if (isService) {
      return categoriaNombre || data.nombre?.trim().toUpperCase() || 'SERVICIO SIN NOMBRE';
    }

    // Para productos: Categoría + Modelo (Ej: MOUSE GAMER LOGITECH 520)
    const partes = [categoriaNombre, modelo].filter(Boolean);
    const nombreGenerado = partes.join(' ').trim();

    return nombreGenerado || data.nombre?.trim().toUpperCase() || 'PRODUCTO SIN NOMBRE';
  }

  // Listar productos con filtros y paginación
  async listar(filtros: FiltrosProducto = {}) {
    const { busqueda, tipo, categoriaId, marcaId, esServicio, bajoStock, preciosPendientes, skip = 0, take = 50 } = filtros;

    const where: Prisma.ProductoWhereInput = {
      deletedAt: null,
      ...(busqueda && {
        OR: [
          { nombre: { contains: busqueda, mode: 'insensitive' } },
          { modelo: { contains: busqueda, mode: 'insensitive' } },
          { descripcion: { contains: busqueda, mode: 'insensitive' } },
          { sku: { contains: busqueda, mode: 'insensitive' } },
          { codigoBarras: { contains: busqueda, mode: 'insensitive' } },
        ],
      }),
      ...(tipo && { tipo }),
      ...(categoriaId && { categoriaId }),
      ...(marcaId && { marcaId }),
      ...(esServicio !== undefined && { esServicio }),
      ...(bajoStock && {
        tipo: 'PRODUCTO',
        esServicio: false,
        stockActual: { lte: prisma.producto.fields.stockMinimo },
      }),
      ...(preciosPendientes && {
        tipo: 'PRODUCTO',
        esServicio: false,
        OR: [
          { precioCompra: { equals: 0 } },
          { precioVenta: { equals: 0 } },
        ],
      }),
    };

    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        where,
        include: {
          categoria: { select: { id: true, nombre: true, tipo: true } },
          marcaRel: { select: { id: true, nombre: true } },
          ubicacion: { select: { id: true, nombre: true } },
          padre: { select: { id: true, nombre: true } },
          historialCostos: {
            orderBy: { fechaRegistro: 'desc' },
            take: 1,
            select: { costo: true, fechaRegistro: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.producto.count({ where }),
    ]);

    // Agregar ultimoCostoCompra a cada producto
    const productosConUltimoCosto = productos.map((p) => ({
      ...p,
      ultimoCostoCompra: p.historialCostos[0]?.costo 
        ? Number(p.historialCostos[0].costo) 
        : Number(p.precioCompra),
    }));

    return { productos: productosConUltimoCosto, total };
  }

  // Búsqueda para combobox (productos físicos o servicios)
  async buscarParaCombobox(query: string, excludeId?: string, incluirServicios = false) {
    return await prisma.producto.findMany({
      where: {
        deletedAt: null,
        ...(!incluirServicios && { tipo: 'PRODUCTO', esServicio: false }),
        ...(excludeId && { id: { not: excludeId } }),
        OR: [
          { nombre: { contains: query, mode: 'insensitive' } },
          { modelo: { contains: query, mode: 'insensitive' } },
          { descripcion: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        nombre: true,
        tipo: true,
        marca: true,
        modelo: true,
        descripcion: true,
        stockActual: true,
        esServicio: true,
        precioVenta: true,
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
        tipo: 'PRODUCTO',
        esServicio: false,
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
        tipo: 'PRODUCTO',
        esServicio: false,
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

    const hoy = new Date();
    const productosConDias = productos.map((producto) => {
      const ultimaVenta = producto.detalleVentas[0]?.createdAt || producto.createdAt;
      const diasSinMovimiento = Math.floor(
        (hoy.getTime() - new Date(ultimaVenta).getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: producto.id,
        nombre: producto.nombre,
        tipo: producto.tipo,
        stockActual: producto.stockActual,
        categoria: producto.categoria,
        ultimaVenta: producto.detalleVentas[0]?.createdAt || null,
        diasSinMovimiento,
      };
    });

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
        marcaRel: true,
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
        historialCostos: {
          orderBy: { fechaRegistro: 'desc' },
          take: 20,
        },
      },
    });
  }

  // Crear producto o servicio
  async crear(data: CrearProductoData, usuarioId?: string): Promise<Producto> {
    const tipo: TipoItem = data.tipo || (data.esServicio ? 'SERVICIO' : 'PRODUCTO');
    const esServicio = tipo === 'SERVICIO';

    const nombre = await this.generarNombreProducto({
      tipo,
      nombre: data.nombre,
      categoriaId: data.categoriaId,
      modelo: data.modelo,
    });

    const padreId = data.padreId && data.padreId.trim() !== '' ? data.padreId.trim() : null;
    const marcaId = data.marcaId && data.marcaId.trim() !== '' ? data.marcaId.trim() : null;
    const ubicacionId = data.ubicacionId && data.ubicacionId.trim() !== '' ? data.ubicacionId.trim() : null;

    return await prisma.$transaction(async (tx) => {
      // Verificar si usuarioId existe realmente en BD para evitar P2003
      let finalUsuarioId: string | null = null;
      if (usuarioId) {
        const userExists = await tx.usuario.findUnique({
          where: { id: usuarioId },
          select: { id: true },
        });
        if (userExists) {
          finalUsuarioId = userExists.id;
        }
      }

      const producto = await tx.producto.create({
        data: {
          tipo,
          nombre,
          marca: null,
          marcaId,
          modelo: esServicio ? null : (data.modelo ? data.modelo.trim().toUpperCase() : null),
          sku: esServicio ? null : (data.sku ? data.sku.trim().toUpperCase() : null),
          codigoBarras: esServicio ? null : (data.codigoBarras ? data.codigoBarras.trim().toUpperCase() : null),
          descripcion: data.descripcion ? data.descripcion.trim().toUpperCase() : null,
          categoriaId: data.categoriaId,
          ubicacionId,
          precioCompra: esServicio ? new Prisma.Decimal(0) : new Prisma.Decimal(data.precioCompra || 0),
          precioVenta: new Prisma.Decimal(data.precioVenta),
          margenReferencia: data.margenReferencia ? new Prisma.Decimal(data.margenReferencia) : null,
          stockActual: esServicio ? 0 : (data.stockActual ?? 0),
          stockMinimo: esServicio ? 0 : (data.stockMinimo ?? 0),
          imagenUrl: data.imagenUrl,
          specs: data.specs,
          esServicio,
          esSegundaMano: false,
          preciosPendientes: data.preciosPendientes ?? false,
          padreId,
          requiereSerie: esServicio ? false : (data.requiereSerie ?? false),
          garantiaProveedorMeses: esServicio ? 0 : (data.garantiaProveedorMeses ?? 0),
          garantiaClienteMeses: esServicio ? 0 : (data.garantiaClienteMeses ?? 0),
        },
      });

      // Movimiento inicial solo para productos con stock > 0
      if (producto.stockActual > 0 && !esServicio) {
        await tx.movimientoStock.create({
          data: {
            productoId: producto.id,
            usuarioId: finalUsuarioId,
            tipo: 'INVENTARIO_INICIAL',
            cantidad: producto.stockActual,
            motivo: 'Stock inicial al crear producto',
          },
        });
      }

      // Historial de costos solo para productos con costo > 0
      if (!esServicio && Number(producto.precioCompra) > 0) {
        await tx.historialCosto.create({
          data: {
            productoId: producto.id,
            costo: producto.precioCompra,
            fechaRegistro: new Date(),
          },
        });
      }

      return producto;
    });
  }

  // Actualizar producto
  async actualizar(id: string, data: ActualizarProductoData): Promise<Producto> {
    const productoActual = await prisma.producto.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        tipo: true,
        nombre: true,
        modelo: true,
        categoriaId: true,
        precioCompra: true,
        precioVenta: true,
      },
    });

    const tipo: TipoItem = data.tipo || productoActual.tipo;
    const esServicio = tipo === 'SERVICIO';

    const categoriaId = data.categoriaId || productoActual.categoriaId;
    const modelo = data.modelo !== undefined ? data.modelo : productoActual.modelo;

    const nombre = await this.generarNombreProducto({
      tipo,
      nombre: data.nombre,
      categoriaId,
      modelo: modelo || undefined,
    });

    const updateData: any = {
      tipo,
      nombre,
      esServicio,
      categoriaId,
      descripcion: data.descripcion !== undefined 
        ? (data.descripcion ? data.descripcion.trim().toUpperCase() : null) 
        : undefined,
      imagenUrl: data.imagenUrl,
      specs: data.specs,
    };

    if (data.padreId !== undefined) {
      updateData.padreId = data.padreId && data.padreId.trim() !== '' ? data.padreId.trim() : null;
    }

    if (esServicio) {
      updateData.modelo = null;
      updateData.marca = null;
      updateData.marcaId = null;
      updateData.sku = null;
      updateData.codigoBarras = null;
      updateData.ubicacionId = null;
      updateData.precioCompra = new Prisma.Decimal(0);
      updateData.stockMinimo = 0;
      updateData.requiereSerie = false;
      updateData.garantiaProveedorMeses = 0;
      updateData.garantiaClienteMeses = 0;
    } else {
      if (data.modelo !== undefined) {
        updateData.modelo = data.modelo ? data.modelo.trim().toUpperCase() : null;
      }
      if (data.sku !== undefined) {
        updateData.sku = data.sku ? data.sku.trim().toUpperCase() : null;
      }
      if (data.codigoBarras !== undefined) {
        updateData.codigoBarras = data.codigoBarras ? data.codigoBarras.trim().toUpperCase() : null;
      }
      if (data.precioCompra !== undefined) {
        updateData.precioCompra = new Prisma.Decimal(data.precioCompra);
      }
      if (data.stockMinimo !== undefined) {
        updateData.stockMinimo = data.stockMinimo;
      }
      if (data.requiereSerie !== undefined) {
        updateData.requiereSerie = data.requiereSerie;
      }
      if (data.garantiaProveedorMeses !== undefined) {
        updateData.garantiaProveedorMeses = data.garantiaProveedorMeses;
      }
      if (data.garantiaClienteMeses !== undefined) {
        updateData.garantiaClienteMeses = data.garantiaClienteMeses;
      }
    }

    if (data.precioVenta !== undefined) {
      updateData.precioVenta = new Prisma.Decimal(data.precioVenta);
    }

    // Recalcular margen si aplica
    if (data.margenReferencia !== undefined) {
      updateData.margenReferencia = data.margenReferencia ? new Prisma.Decimal(data.margenReferencia) : null;
    } else if (!esServicio && (data.precioCompra !== undefined || data.precioVenta !== undefined)) {
      const pCompra = data.precioCompra !== undefined ? data.precioCompra : Number(productoActual.precioCompra);
      const pVenta = data.precioVenta !== undefined ? data.precioVenta : Number(productoActual.precioVenta);
      if (pCompra > 0 && pVenta > 0) {
        const margen = ((pVenta - pCompra) / pCompra) * 100;
        updateData.margenReferencia = new Prisma.Decimal(margen);
      }
    }

    return await prisma.producto.update({
      where: { id },
      data: updateData,
    });
  }

  // Ajustar stock
  async ajustarStock(
    id: string,
    data: {
      cantidad: number;
      tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
      motivo: string;
      numerosSerie?: string[];
    },
    usuarioId: string
  ): Promise<Producto> {
    const { cantidad, tipo, motivo } = data;

    const producto = await prisma.producto.findFirst({
      where: { id, deletedAt: null },
    });

    if (!producto) {
      throw new Error('Producto no encontrado');
    }

    if (producto.tipo === 'SERVICIO' || producto.esServicio) {
      throw new Error('No se puede ajustar el stock de un servicio');
    }

    let nuevoStock = producto.stockActual;
    if (tipo === 'ENTRADA') {
      nuevoStock += cantidad;
    } else if (tipo === 'SALIDA') {
      if (producto.stockActual < cantidad) {
        throw new Error(`Stock insuficiente. Stock actual: ${producto.stockActual}, solicitado: ${cantidad}`);
      }
      nuevoStock -= cantidad;
    } else if (tipo === 'AJUSTE') {
      nuevoStock = cantidad;
    }

    return await prisma.$transaction(async (tx) => {
      let finalUsuarioId: string | null = null;
      if (usuarioId) {
        const userExists = await tx.usuario.findUnique({
          where: { id: usuarioId },
          select: { id: true },
        });
        if (userExists) {
          finalUsuarioId = userExists.id;
        }
      }

      const productoActualizado = await tx.producto.update({
        where: { id },
        data: { stockActual: nuevoStock },
      });

      await tx.movimientoStock.create({
        data: {
          productoId: id,
          usuarioId: finalUsuarioId,
          tipo,
          cantidad: tipo === 'AJUSTE' ? Math.abs(nuevoStock - producto.stockActual) : cantidad,
          motivo,
        },
      });

      return productoActualizado;
    });
  }

  // Eliminar producto (soft delete)
  async eliminar(id: string, forzar = false): Promise<Producto> {
    const tieneVentas = await prisma.detalleVenta.count({
      where: { productoId: id },
    });

    if (tieneVentas > 0 && !forzar) {
      throw new Error('El producto tiene ventas registradas en el historial. ¿Deseas archivarlo de todas formas?|CONFIRMAR_REQUERIDO');
    }

    return await prisma.producto.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        sku: null,
        codigoBarras: null,
      },
    });
  }

  // Restaurar producto
  async restaurar(id: string): Promise<Producto> {
    return await prisma.producto.update({
      where: { id },
      data: {
        deletedAt: null,
      },
    });
  }
}

export default new ProductoService();
