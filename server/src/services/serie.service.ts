import { PrismaClient, EstadoSerie } from '@prisma/client';

const prisma = new PrismaClient();

function normalizarSeries(numerosSerie: string[]): string[] {
  return numerosSerie
    .map((ns) => ns.trim().toUpperCase())
    .filter((ns) => ns.length > 0);
}

function obtenerDuplicados(numerosSerie: string[]): string[] {
  const vistos = new Set<string>();
  const duplicados = new Set<string>();

  for (const serie of numerosSerie) {
    if (vistos.has(serie)) {
      duplicados.add(serie);
    }
    vistos.add(serie);
  }

  return Array.from(duplicados);
}

/**
 * Servicio para gestionar números de serie de productos
 */
export const serieService = {
  /**
   * Verificar si un número de serie está disponible (no existe en BD)
   */
  async verificarDisponibilidad(numeroSerie: string): Promise<boolean> {
    const existe = await prisma.productoSerie.findUnique({
      where: { numeroSerie },
    });
    return existe === null;
  },

  /**
   * Registrar múltiples números de serie al realizar una compra
   */
  async registrarSeriesDesdeCompra(
    productoId: string,
    compraId: string,
    numerosSerie: string[]
  ) {
    const seriesNormalizadas = normalizarSeries(numerosSerie);

    if (seriesNormalizadas.length === 0) {
      throw new Error('Debe proporcionar al menos un número de serie válido');
    }

    // Validar que no existan duplicados en el array
    const duplicadosLocales = obtenerDuplicados(seriesNormalizadas);
    if (duplicadosLocales.length > 0) {
      throw new Error(
        `Números de serie duplicados en la lista: ${duplicadosLocales.join(', ')}`
      );
    }

    // Validar que no existan en la BD
    const existentes = await prisma.productoSerie.findMany({
      where: {
        numeroSerie: { in: seriesNormalizadas },
      },
      select: { numeroSerie: true },
    });

    if (existentes.length > 0) {
      throw new Error(
        `Los siguientes números de serie ya existen: ${existentes.map((s) => s.numeroSerie).join(', ')}`
      );
    }

    // Crear todos los registros
    return await prisma.productoSerie.createMany({
      data: seriesNormalizadas.map((ns) => ({
        productoId,
        compraId,
        numeroSerie: ns,
        estado: EstadoSerie.DISPONIBLE,
      })),
    });
  },

  /**
   * Registrar números de serie retroactivamente (sin compraId)
   * Usado cuando se activa requiereSerie en un producto con stock existente
   */
  async registrarSeriesRetroactivas(
    productoId: string,
    numerosSerie: string[]
  ) {
    const seriesNormalizadas = normalizarSeries(numerosSerie);

    // Validar que no existan duplicados en el array
    const duplicadosLocales = obtenerDuplicados(seriesNormalizadas);
    if (duplicadosLocales.length > 0) {
      throw new Error(
        `Números de serie duplicados en la lista: ${duplicadosLocales.join(', ')}`
      );
    }

    const producto = await prisma.producto.findUnique({
      where: { id: productoId },
      select: {
        id: true,
        nombre: true,
        stockActual: true,
        garantiaProveedorMeses: true,
        garantiaClienteMeses: true,
      },
    });

    if (!producto) {
      throw new Error('Producto no encontrado para registrar series');
    }

    const seriesDisponiblesActuales = await prisma.productoSerie.count({
      where: {
        productoId,
        estado: EstadoSerie.DISPONIBLE,
      },
    });

    const faltantes = producto.stockActual - seriesDisponiblesActuales;

    if (faltantes < 0) {
      throw new Error(
        `Inconsistencia detectada en "${producto.nombre}": hay ${seriesDisponiblesActuales} series DISPONIBLES pero stock actual ${producto.stockActual}. Debe reconciliarse antes de continuar.`
      );
    }

    if (faltantes === 0) {
      if (seriesNormalizadas.length > 0) {
        throw new Error(
          `No se requieren series adicionales para "${producto.nombre}". El stock ya está cubierto por series disponibles.`
        );
      }

      return { count: 0 };
    }

    if (seriesNormalizadas.length !== faltantes) {
      throw new Error(
        `Debe registrar exactamente ${faltantes} serie(s) para "${producto.nombre}". Se recibieron ${seriesNormalizadas.length}.`
      );
    }

    // Validar que no existan en la BD
    const existentes = await prisma.productoSerie.findMany({
      where: {
        numeroSerie: { in: seriesNormalizadas },
      },
      select: { numeroSerie: true },
    });

    if (existentes.length > 0) {
      throw new Error(
        `Los siguientes números de serie ya existen: ${existentes.map((s) => s.numeroSerie).join(', ')}`
      );
    }

    // Crear todos los registros sin compraId (retroactivo)
    return await prisma.productoSerie.createMany({
      data: seriesNormalizadas.map((ns) => ({
        productoId,
        numeroSerie: ns,
        estado: EstadoSerie.DISPONIBLE,
        garantiaProveedorMeses: producto.garantiaProveedorMeses,
        garantiaClienteMeses: producto.garantiaClienteMeses,
        // compraId será null para series retroactivas
      })),
    });
  },

  /**
   * Obtener series disponibles de un producto específico
   */
  async obtenerSeriesDisponibles(productoId: string) {
    return await prisma.productoSerie.findMany({
      where: {
        productoId,
        estado: EstadoSerie.DISPONIBLE,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        compra: {
          select: {
            id: true,
            fechaCompra: true,
            proveedor: {
              select: { nombreEmpresa: true },
            },
          },
        },
      },
    });
  },

  /**
   * Obtener todas las series de un producto (con filtros opcionales)
   */
  async obtenerSeriesPorProducto(
    productoId: string,
    estado?: EstadoSerie
  ) {
    return await prisma.productoSerie.findMany({
      where: {
        productoId,
        ...(estado && { estado }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        compra: {
          select: {
            id: true,
            fechaCompra: true,
            proveedor: { select: { nombreEmpresa: true } },
          },
        },
        venta: {
          select: {
            id: true,
            fecha: true,
            clienteNombre: true,
          },
        },
        producto: {
          select: {
            id: true,
            nombre: true,
            marca: true,
            modelo: true,
            ubicacion: { select: { nombre: true } },
          },
        },
      },
    });
  },

  /**
   * Buscar una serie por número y obtener toda su información
   */
  async buscarPorNumeroSerie(numeroSerie: string) {
    return await prisma.productoSerie.findUnique({
      where: { numeroSerie: numeroSerie.trim().toUpperCase() },
      include: {
        producto: {
          include: {
            categoria: true,
            ubicacion: true,
          },
        },
        compra: {
          include: {
            proveedor: true,
          },
        },
        venta: {
          include: {
            usuario: {
              select: {
                id: true,
                nombreCompleto: true,
              },
            },
          },
        },
      },
    });
  },

  /**
   * Marcar una serie como vendida y asociarla a una venta
   */
  async marcarComoVendida(numeroSerie: string, ventaId: string) {
    const serie = await prisma.productoSerie.findUnique({
      where: { numeroSerie: numeroSerie.trim().toUpperCase() },
    });

    if (!serie) {
      throw new Error(`Número de serie no encontrado: ${numeroSerie}`);
    }

    if (serie.estado !== EstadoSerie.DISPONIBLE) {
      throw new Error(
        `El número de serie ${numeroSerie} no está disponible. Estado actual: ${serie.estado}`
      );
    }

    return await prisma.productoSerie.update({
      where: { numeroSerie: numeroSerie.trim().toUpperCase() },
      data: {
        estado: EstadoSerie.VENDIDO,
        ventaId,
      },
    });
  },

  /**
   * Marcar múltiples series como vendidas en una transacción
   */
  async marcarVariasComoVendidas(numerosSerie: string[], ventaId: string) {
    return await prisma.$transaction(
      numerosSerie.map((ns) =>
        prisma.productoSerie.updateMany({
          where: {
            numeroSerie: ns,
            estado: EstadoSerie.DISPONIBLE,
          },
          data: {
            estado: EstadoSerie.VENDIDO,
            ventaId,
          },
        })
      )
    );
  },

  /**
   * Verificar estado de garantía de un producto por su número de serie
   */
  async verificarGarantia(numeroSerie: string) {
    const serie = await prisma.productoSerie.findUnique({
      where: { numeroSerie: numeroSerie.trim().toUpperCase() },
      include: {
        producto: {
          select: {
            nombre: true,
            marca: true,
            modelo: true,
            garantiaClienteMeses: true,
            garantiaProveedorMeses: true,
          },
        },
        venta: {
          select: {
            id: true,
            fecha: true,
            clienteNombre: true,
          },
        },
        compra: {
          select: {
            fechaCompra: true,
            proveedor: {
              select: { nombreEmpresa: true },
            },
          },
        },
      },
    });

    if (!serie) {
      return {
        encontrado: false,
        mensaje: 'Número de serie no encontrado en el sistema',
      };
    }

    // Garantía del cliente (desde la venta)
    // Usa el snapshot de la serie - fallback al producto para series registradas antes del fix
    const mesesCliente = serie.garantiaClienteMeses ?? serie.producto.garantiaClienteMeses;
    let garantiaCliente = null;
    if (serie.venta && mesesCliente > 0) {
      const fechaVenta = new Date(serie.venta.fecha);
      const fechaVencimiento = new Date(fechaVenta);
      fechaVencimiento.setMonth(
        fechaVencimiento.getMonth() + mesesCliente
      );

      const ahora = new Date();
      const vigente = ahora <= fechaVencimiento;
      const diasRestantes = Math.ceil(
        (fechaVencimiento.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)
      );

      garantiaCliente = {
        vigente,
        mesesGarantia: mesesCliente,
        fechaVenta: fechaVenta.toISOString(),
        fechaVencimiento: fechaVencimiento.toISOString(),
        diasRestantes: vigente ? diasRestantes : 0,
        clienteNombre: serie.venta.clienteNombre || 'Cliente genérico',
      };
    }

    // Garantía del proveedor (desde la compra)
    // Usa el snapshot de la serie - fallback al producto para series registradas antes del fix
    const mesesProveedor = serie.garantiaProveedorMeses ?? serie.producto.garantiaProveedorMeses;
    let garantiaProveedor = null;
    if (serie.compra && mesesProveedor > 0) {
      const fechaCompra = new Date(serie.compra.fechaCompra);
      const fechaVencimiento = new Date(fechaCompra);
      fechaVencimiento.setMonth(
        fechaVencimiento.getMonth() + mesesProveedor
      );

      const ahora = new Date();
      const vigente = ahora <= fechaVencimiento;
      const diasRestantes = Math.ceil(
        (fechaVencimiento.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)
      );

      garantiaProveedor = {
        vigente,
        mesesGarantia: mesesProveedor,
        fechaCompra: fechaCompra.toISOString(),
        fechaVencimiento: fechaVencimiento.toISOString(),
        diasRestantes: vigente ? diasRestantes : 0,
        proveedorNombre: serie.compra.proveedor.nombreEmpresa,
      };
    }

    return {
      encontrado: true,
      numeroSerie: serie.numeroSerie,
      estado: serie.estado,
      producto: serie.producto,
      garantiaCliente,
      garantiaProveedor,
    };
  },

  /**
   * Cambiar estado de una serie (para devoluciones, garantías, etc.)
   */
  async cambiarEstado(numeroSerie: string, nuevoEstado: EstadoSerie) {
    return await prisma.productoSerie.update({
      where: { numeroSerie: numeroSerie.trim().toUpperCase() },
      data: { estado: nuevoEstado },
    });
  },

  /**
   * Contar series por estado de un producto
   */
  async contarSeriesPorEstado(productoId: string) {
    const series = await prisma.productoSerie.groupBy({
      by: ['estado'],
      where: { productoId },
      _count: true,
    });

    return series.reduce(
      (acc, item) => {
        acc[item.estado] = item._count;
        return acc;
      },
      {
        DISPONIBLE: 0,
        VENDIDO: 0,
        GARANTIA: 0,
        DEVUELTO: 0,
      } as Record<EstadoSerie, number>
    );
  },
};
