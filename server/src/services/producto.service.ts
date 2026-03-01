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
  categoriaId?: string;
  esServicio?: boolean;
  bajoStock?: boolean;
  preciosPendientes?: boolean;
  skip?: number;
  take?: number;
}

export class ProductoService {
  // Listar productos con filtros y paginación
  async listar(filtros: FiltrosProducto = {}) {
    const { busqueda, categoriaId, esServicio, bajoStock, preciosPendientes, skip = 0, take = 50 } = filtros;

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
      ...(preciosPendientes && {
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
          categoria: { select: { id: true, nombre: true } },
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
    const productosConUltimoCosto = productos.map(p => ({
      ...p,
      ultimoCostoCompra: p.historialCostos[0]?.costo 
        ? Number(p.historialCostos[0].costo) 
        : Number(p.precioCompra),
    }));

    return { productos: productosConUltimoCosto, total };
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
        historialCostos: {
          orderBy: { fechaRegistro: 'desc' },
          take: 20, // Últimos 20 cambios de precio
        },
      },
    });
  }

  // AJUSTE CRÍTICO: Crear con MovimientoStock automático
  async crear(data: CrearProductoData, usuarioId: string): Promise<Producto> {
    // Si es servicio, forzar valores por defecto en campos que no aplican
    const esServicio = data.esServicio ?? false;
    
    const producto = await prisma.producto.create({
      data: {
        nombre: data.nombre,
        marca: esServicio ? null : data.marca,
        modelo: esServicio ? null : data.modelo,
        sku: esServicio ? null : data.sku,
        codigoBarras: esServicio ? null : data.codigoBarras,
        descripcion: data.descripcion,
        categoriaId: data.categoriaId,
        ubicacionId: esServicio ? null : data.ubicacionId,
        precioCompra: esServicio ? new Prisma.Decimal(0) : new Prisma.Decimal(data.precioCompra),
        precioVenta: new Prisma.Decimal(data.precioVenta),
        margenReferencia: data.margenReferencia ? new Prisma.Decimal(data.margenReferencia) : null,
        stockActual: esServicio ? 0 : (data.stockActual ?? 0),
        stockMinimo: esServicio ? 0 : (data.stockMinimo ?? 1),
        imagenUrl: data.imagenUrl,
        specs: data.specs,
        esServicio,
        esSegundaMano: data.esSegundaMano ?? false,
        preciosPendientes: data.preciosPendientes ?? false,
        padreId: data.padreId,
        requiereSerie: data.requiereSerie ?? false,
        garantiaProveedorMeses: data.garantiaProveedorMeses,
        garantiaClienteMeses: data.garantiaClienteMeses,
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

    // Registrar costo inicial en historial (solo si NO es servicio y tiene precio de compra REAL)
    // Filtrar valores temporales < 1 (ej: Crear Producto Rápido usa 0.01)
    if (!producto.esServicio && Number(producto.precioCompra) >= 1) {
      await prisma.historialCosto.create({
        data: {
          productoId: producto.id,
          costo: producto.precioCompra,
          fechaRegistro: new Date(),
        },
      });
    }

    return producto;
  }

  // Actualizar producto
  async actualizar(id: string, data: ActualizarProductoData): Promise<Producto> {
    // Si se está marcando como servicio, limpiar campos que no aplican
    const updateData: any = { ...data };
    
    if (data.esServicio === true) {
      updateData.marca = null;
      updateData.modelo = null;
      updateData.sku = null;
      updateData.codigoBarras = null;
      updateData.ubicacionId = null;
      updateData.precioCompra = new Prisma.Decimal(0);
      updateData.stockMinimo = 0;
    }
    
    // Recalcular margenReferencia automáticamente si se actualiza precioCompra o precioVenta
    // (pero solo si no se proveyó explícitamente un margenReferencia)
    if (updateData.margenReferencia === undefined && (updateData.precioCompra || updateData.precioVenta)) {
      // Obtener datos actuales del producto
      const productoActual = await prisma.producto.findUnique({
        where: { id },
        select: { precioCompra: true, precioVenta: true },
      });
      
      if (productoActual) {
        const precioCompraFinal = updateData.precioCompra || Number(productoActual.precioCompra);
        const precioVentaFinal = updateData.precioVenta || Number(productoActual.precioVenta);
        
        // Solo calcular si ambos precios son válidos (>= 1)
        if (precioCompraFinal >= 1 && precioVentaFinal >= 1) {
          const margenCalculado = ((precioVentaFinal - precioCompraFinal) / precioCompraFinal) * 100;
          updateData.margenReferencia = new Prisma.Decimal(margenCalculado);
        }
      }
    }
    
    return await prisma.producto.update({
      where: { id },
      data: {
        ...updateData,
        ...(updateData.precioCompra && { precioCompra: new Prisma.Decimal(updateData.precioCompra) }),
        ...(updateData.precioVenta && { precioVenta: new Prisma.Decimal(updateData.precioVenta) }),
        ...(updateData.margenReferencia !== undefined && { 
          margenReferencia: updateData.margenReferencia ? new Prisma.Decimal(updateData.margenReferencia) : null 
        }),
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
    usuarioId: string,
    numerosSerie?: string[]
  ): Promise<Producto> {
    const producto = await prisma.producto.findUnique({ where: { id } });

    if (!producto) {
      throw new Error('Producto no encontrado');
    }

    if (producto.esServicio) {
      throw new Error('No se puede ajustar stock de un servicio');
    }

    // Validar series si el producto requiere número de serie
    if (producto.requiereSerie) {
      if (tipo === 'ENTRADA') {
        if (!numerosSerie || numerosSerie.length === 0) {
          throw new Error('Este producto requiere números de serie. Debe proporcionar las series.');
        }
        if (numerosSerie.length !== cantidad) {
          throw new Error(
            `La cantidad de series (${numerosSerie.length}) no coincide con la cantidad a agregar (${cantidad})`
          );
        }
      } else if (tipo === 'SALIDA') {
        if (!numerosSerie || numerosSerie.length === 0) {
          throw new Error('Este producto requiere números de serie. Debe seleccionar las series a retirar.');
        }
        if (numerosSerie.length !== cantidad) {
          throw new Error(
            `La cantidad de series (${numerosSerie.length}) no coincide con la cantidad a retirar (${cantidad})`
          );
        }
        
        // Validar que todas las series existen y están DISPONIBLES
        const seriesExistentes = await prisma.productoSerie.findMany({
          where: {
            productoId: id,
            numeroSerie: { in: numerosSerie },
          },
        });
        
        if (seriesExistentes.length !== numerosSerie.length) {
          throw new Error('Algunas series seleccionadas no existen para este producto');
        }
        
        const seriesNoDisponibles = seriesExistentes.filter((s) => s.estado !== 'DISPONIBLE');
        if (seriesNoDisponibles.length > 0) {
          throw new Error(
            `Las siguientes series no están disponibles: ${seriesNoDisponibles.map((s) => s.numeroSerie).join(', ')}`
          );
        }
      }
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

    // Validar que el usuario existe (trazabilidad obligatoria)
    const usuarioExiste = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuarioExiste) {
      throw new Error('Sesión inválida. Por favor, cierre sesión y vuelva a iniciar.');
    }

    // Preparar operaciones de transacción
    const transactionOperations: any[] = [
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
    ];

    // Si hay series, agregarlas o actualizarlas según el tipo
    if (numerosSerie && numerosSerie.length > 0) {
      if (tipo === 'ENTRADA') {
        // Crear nuevas series con estado DISPONIBLE
        const seriesData = numerosSerie.map((numeroSerie) => ({
          productoId: id,
          numeroSerie,
          estado: 'DISPONIBLE' as const,
        }));
        
        transactionOperations.push(
          prisma.productoSerie.createMany({
            data: seriesData,
          })
        );
      } else if (tipo === 'SALIDA') {
        // Marcar series como DEVUELTO
        transactionOperations.push(
          prisma.productoSerie.updateMany({
            where: {
              productoId: id,
              numeroSerie: { in: numerosSerie },
            },
            data: {
              estado: 'DEVUELTO' as const,
            },
          })
        );
      }
    }

    // Actualizar stock, registrar movimiento y crear series en transacción
    const [productoActualizado] = await prisma.$transaction(transactionOperations);

    return productoActualizado;
  }

  // Soft delete con validaciones
  async eliminar(id: string, forzar: boolean = false): Promise<Producto> {
    const producto = await prisma.producto.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            detalleVentas: true,
            detalleCompras: true,
          },
        },
      },
    });

    if (!producto) {
      throw new Error('Producto no encontrado');
    }

    if (producto.deletedAt !== null) {
      throw new Error('El producto ya está eliminado');
    }

    // 1. BLOQUEO: Productos con hijos asignados
    const hijos = await prisma.producto.count({
      where: { padreId: id, deletedAt: null },
    });

    if (hijos > 0) {
      throw new Error(`No se puede eliminar el producto porque tiene ${hijos} componente(s) asignado(s)`);
    }

    // 2. BLOQUEO: Productos con stock actual > 0
    if (producto.stockActual > 0 && !producto.esServicio) {
      throw new Error(
        `No se puede eliminar el producto porque tiene stock actual de ${producto.stockActual} unidades. ` +
        `Debe ajustar el stock a 0 antes de eliminar.`
      );
    }

    // 3. ADVERTENCIA: Productos con historial de ventas/compras (requiere confirmación)
    const tieneVentas = producto._count.detalleVentas > 0;
    const tieneCompras = producto._count.detalleCompras > 0;

    if ((tieneVentas || tieneCompras) && !forzar) {
      const mensajes = [];
      if (tieneVentas) mensajes.push(`${producto._count.detalleVentas} venta(s) registrada(s)`);
      if (tieneCompras) mensajes.push(`${producto._count.detalleCompras} compra(s) registrada(s)`);
      
      throw new Error(
        `ADVERTENCIA: Este producto tiene ${mensajes.join(' y ')}. ` +
        `Eliminar afectará el historial. ¿Confirmar eliminación?|CONFIRMAR_REQUERIDO`
      );
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

  // Restaurar producto eliminado
  async restaurar(id: string): Promise<Producto> {
    const producto = await prisma.producto.findUnique({
      where: { id },
    });

    if (!producto) {
      throw new Error('Producto no encontrado');
    }

    if (producto.deletedAt === null) {
      throw new Error('El producto no está eliminado');
    }

    return await prisma.producto.update({
      where: { id },
      data: {
        deletedAt: null,
        updatedAt: new Date(),
      },
    });
  }
}

export default new ProductoService();
