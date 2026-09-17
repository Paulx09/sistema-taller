import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';

const toUpperOrUndefined = (val: unknown) => (typeof val === 'string' && val.trim().length > 0 ? val.trim().toUpperCase() : undefined);
const toUpperOrNull = (val: unknown) => (typeof val === 'string' && val.trim().length > 0 ? val.trim().toUpperCase() : null);

const crearProductoSchema = z
  .object({
    tipo: z.enum(['PRODUCTO', 'SERVICIO']).default('PRODUCTO').optional(),
    nombre: z
      .string()
      .max(150, 'El nombre no puede exceder 150 caracteres')
      .trim()
      .transform(toUpperOrUndefined)
      .optional(),
    marca: z.string().max(50, 'La marca no puede exceder 50 caracteres').trim().transform(toUpperOrNull).optional().nullable(),
    marcaId: z.string().min(1).optional().nullable(),
    modelo: z.string().max(50, 'El modelo no puede exceder 50 caracteres').trim().transform(toUpperOrNull).optional().nullable(),
    sku: z.string().max(50, 'El SKU no puede exceder 50 caracteres').trim().transform(toUpperOrNull).optional().nullable(),
    codigoBarras: z
      .string()
      .max(50, 'El código de barras no puede exceder 50 caracteres')
      .trim()
      .transform(toUpperOrNull)
      .optional()
      .nullable(),
    descripcion: z
      .string()
      .max(255, 'La descripción no puede exceder 255 caracteres')
      .trim()
      .transform(toUpperOrNull)
      .optional()
      .nullable(),
    categoriaId: z.string().min(1, 'El ID de categoría es requerido'),
    ubicacionId: z.string().min(1).optional().nullable(),
    precioCompra: z
      .number({ message: 'El precio de compra debe ser un número' })
      .nonnegative('El precio de compra no puede ser negativo')
      .max(9999999.99, 'El precio de compra excede el límite')
      .default(0)
      .optional(),
    precioVenta: z
      .number({ message: 'El precio de venta debe ser un número' })
      .nonnegative('El precio de venta no puede ser negativo')
      .max(9999999.99, 'El precio de venta excede el límite'),
    margenReferencia: z
      .number({ message: 'El margen de referencia debe ser un número' })
      .nonnegative('El margen de referencia no puede ser negativo')
      .max(999.99, 'El margen de referencia excede el límite')
      .optional()
      .nullable(),
    stockActual: z
      .number({ message: 'El stock actual debe ser un número' })
      .int('El stock debe ser un número entero')
      .nonnegative('El stock no puede ser negativo')
      .default(0)
      .optional(),
    stockMinimo: z
      .number({ message: 'El stock mínimo debe ser un número' })
      .int('El stock mínimo debe ser un número entero')
      .min(0, 'El stock mínimo no puede ser negativo')
      .default(0)
      .optional(),
    imagenUrl: z.string().optional().nullable().or(z.literal('')),
    specs: z.record(z.string(), z.any()).optional().nullable(),
    esServicio: z.boolean().default(false).optional(),
    esSegundaMano: z.boolean().default(false).optional(),
    padreId: z.string().min(1).optional().nullable(),
    requiereSerie: z.boolean().default(false).optional(),
    garantiaProveedorMeses: z
      .number({ message: 'La garantía del proveedor debe ser un número' })
      .int('La garantía del proveedor debe ser un número entero')
      .min(0, 'La garantía del proveedor no puede ser negativa')
      .default(0)
      .optional(),
    garantiaClienteMeses: z
      .number({ message: 'La garantía del cliente debe ser un número' })
      .int('La garantía del cliente debe ser un número entero')
      .min(0, 'La garantía del cliente no puede ser negativa')
      .default(0)
      .optional(),
    seriesRetroactivas: z.array(z.string()).optional(),
  })
  .refine((data) => {
    // Si es servicio o producto rápido con 0/0, permitir
    const isService = data.tipo === 'SERVICIO' || data.esServicio;
    if (isService) return true;
    const pCompra = data.precioCompra ?? 0;
    const pVenta = data.precioVenta ?? 0;
    if (pCompra === 0 && pVenta === 0) return true;
    if (pCompra === 0) return true;
    return pVenta >= pCompra;
  }, {
    message: 'El precio de venta debe ser mayor o igual al precio de compra',
    path: ['precioVenta'],
  });

// Actualizar producto
const actualizarProductoSchema = z
  .object({
    tipo: z.enum(['PRODUCTO', 'SERVICIO']).optional(),
    nombre: z
      .string()
      .max(150, 'El nombre no puede exceder 150 caracteres')
      .trim()
      .transform(toUpperOrUndefined)
      .optional(),
    marca: z.string().max(50, 'La marca no puede exceder 50 caracteres').trim().transform(toUpperOrNull).optional().nullable(),
    marcaId: z.string().min(1).optional().nullable(),
    modelo: z.string().max(50, 'El modelo no puede exceder 50 caracteres').trim().transform(toUpperOrNull).optional().nullable(),
    sku: z.string().max(50, 'El SKU no puede exceder 50 caracteres').trim().transform(toUpperOrNull).optional().nullable(),
    codigoBarras: z
      .string()
      .max(50, 'El código de barras no puede exceder 50 caracteres')
      .trim()
      .transform(toUpperOrNull)
      .optional()
      .nullable(),
    descripcion: z
      .string()
      .max(255, 'La descripción no puede exceder 255 caracteres')
      .trim()
      .transform(toUpperOrNull)
      .optional()
      .nullable(),
    categoriaId: z.string().min(1).optional(),
    ubicacionId: z.string().min(1).optional().nullable(),
    precioCompra: z
      .number({ message: 'El precio de compra debe ser un número' })
      .nonnegative('El precio de compra no puede ser negativo')
      .max(9999999.99, 'El precio de compra excede el límite')
      .optional(),
    precioVenta: z
      .number({ message: 'El precio de venta debe ser un número' })
      .nonnegative('El precio de venta no puede ser negativo')
      .max(9999999.99, 'El precio de venta excede el límite')
      .optional(),
    margenReferencia: z
      .number({ message: 'El margen de referencia debe ser un número' })
      .nonnegative('El margen de referencia no puede ser negativo')
      .max(999.99, 'El margen de referencia excede el límite')
      .optional()
      .nullable(),
    stockMinimo: z
      .number({ message: 'El stock mínimo debe ser un número' })
      .int('El stock mínimo debe ser un número entero')
      .min(0, 'El stock mínimo no puede ser negativo')
      .optional(),
    stockActual: z.number().optional(),
    imagenUrl: z.string().optional().nullable().or(z.literal('')),
    specs: z.record(z.string(), z.any()).optional().nullable(),
    esServicio: z.boolean().optional(),
    esSegundaMano: z.boolean().optional(),
    padreId: z.string().min(1).optional().nullable(),
    requiereSerie: z.boolean().optional(),
    garantiaProveedorMeses: z
      .number({ message: 'La garantía del proveedor debe ser un número' })
      .int('La garantía del proveedor debe ser un número entero')
      .min(0, 'La garantía del proveedor no puede ser negativa')
      .optional(),
    garantiaClienteMeses: z
      .number({ message: 'La garantía del cliente debe ser un número' })
      .int('La garantía del cliente debe ser un número entero')
      .min(0, 'La garantía del cliente no puede ser negativa')
      .optional(),
    seriesRetroactivas: z.array(z.string()).optional(),
  })
  .strict();

const ajustarStockSchema = z.object({
  cantidad: z
    .number({ message: 'La cantidad debe ser un número' })
    .int('La cantidad debe ser un número entero')
    .positive('La cantidad debe ser mayor a 0'),
  tipo: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE'], {
    message: 'El tipo debe ser ENTRADA, SALIDA o AJUSTE',
  }),
  motivo: z
    .string()
    .min(3, 'El motivo debe tener al menos 3 caracteres')
    .max(100, 'El motivo no puede exceder 100 caracteres')
    .trim(),
  numerosSerie: z.array(z.string()).optional(),
});

const idParamSchema = z.object({
  id: z.string().min(1, 'El ID es requerido'),
});

const busquedaQuerySchema = z.object({
  q: z.string().min(1, 'El término de búsqueda es requerido').optional(),
  excludeId: z.string().min(1).optional(),
});

// Middleware de validación genérico
const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validación fallida',
          details: error.issues.map((issue) => ({
            campo: issue.path.join('.'),
            mensaje: issue.message,
          })),
        });
      }
      next(error);
    }
  };
};

// Middleware para validar ID en params
const validateId = (req: Request, res: Response, next: NextFunction) => {
  try {
    idParamSchema.parse(req.params);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'ID inválido',
        mensaje: 'El ID debe ser un UUID válido',
      });
    }
    next(error);
  }
};

// Middleware para validar query params de búsqueda
const validateBusqueda = (req: Request, res: Response, next: NextFunction) => {
  try {
    busquedaQuerySchema.parse(req.query);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Parámetros de búsqueda inválidos',
        details: error.issues.map((issue) => ({
          campo: issue.path.join('.'),
          mensaje: issue.message,
        })),
      });
    }
    next(error);
  }
};

// Validación de negocio: Verificar que categoría existe
const validarCategoriaExiste = async (req: Request, res: Response, next: NextFunction) => {
  const { categoriaId } = req.body;

  if (!categoriaId) {
    return next();
  }

  try {
    const categoria = await prisma.categoria.findFirst({
      where: { id: categoriaId, deletedAt: null },
    });

    if (!categoria) {
      return res.status(404).json({
        error: 'Categoría no encontrada',
        mensaje: 'La categoría especificada no existe o fue eliminada',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Validación de negocio: Verificar que ubicación existe (si se envía)
const validarUbicacionExiste = async (req: Request, res: Response, next: NextFunction) => {
  const { ubicacionId } = req.body;

  if (!ubicacionId) {
    return next();
  }

  try {
    const ubicacion = await prisma.ubicacion.findFirst({
      where: { id: ubicacionId, deletedAt: null },
    });

    if (!ubicacion) {
      return res.status(404).json({
        error: 'Ubicación no encontrada',
        mensaje: 'La ubicación especificada no existe o fue eliminada',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Validación recursividad: Padre no puede ser servicio ni el mismo producto
const validarProductoPadre = async (req: Request, res: Response, next: NextFunction) => {
  const { padreId } = req.body;
  const productoId = req.params.id; // Para update

  if (!padreId) {
    return next();
  }

  if (productoId && padreId === productoId) {
    return res.status(400).json({
      error: 'Recursividad inválida',
      mensaje: 'Un producto no puede ser padre de sí mismo',
    });
  }

  try {
    const padre = await prisma.producto.findFirst({
      where: { id: padreId, deletedAt: null },
    });

    if (!padre) {
      return res.status(404).json({
        error: 'Producto padre no encontrado',
        mensaje: 'El producto padre especificado no existe o fue eliminado',
      });
    }

    if (padre.tipo === 'SERVICIO' || padre.esServicio) {
      return res.status(400).json({
        error: 'Producto padre inválido',
        mensaje: 'Un servicio no puede ser producto padre (solo productos físicos)',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Validación de negocio: Verificar que marca existe (si se envía marcaId)
const validarMarcaExiste = async (req: Request, res: Response, next: NextFunction) => {
  const { marcaId } = req.body;

  if (!marcaId) {
    return next();
  }

  try {
    const marca = await prisma.marca.findFirst({
      where: { id: marcaId, deletedAt: null },
    });

    if (!marca) {
      return res.status(404).json({
        error: 'Marca no encontrada',
        mensaje: 'La marca especificada no existe o fue eliminada',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Validador específico para Crear Producto Rápido (desde Compras)
const crearProductoRapidoSchema = z.object({
  tipo: z.enum(['PRODUCTO', 'SERVICIO']).default('PRODUCTO').optional(),
  nombre: z
    .string()
    .max(150, 'El nombre no puede exceder 150 caracteres')
    .trim()
    .transform(toUpperOrUndefined)
    .optional(),
  marca: z.string().max(50, 'La marca no puede exceder 50 caracteres').trim().transform(toUpperOrNull).optional().nullable(),
  marcaId: z.string().min(1).optional().nullable(),
  modelo: z.string().max(50, 'El modelo no puede exceder 50 caracteres').trim().transform(toUpperOrNull).optional().nullable(),
  descripcion: z
    .string()
    .max(255, 'La descripción no puede exceder 255 caracteres')
    .trim()
    .transform(toUpperOrNull)
    .optional()
    .nullable(),
  categoriaId: z.string().min(1, 'El ID de categoría es requerido'),
  ubicacionId: z.string().min(1).optional().nullable(),
  precioCompra: z
    .number({ message: 'El precio de compra debe ser un número' })
    .nonnegative('El precio de compra no puede ser negativo')
    .default(0)
    .optional(),
  precioVenta: z
    .number({ message: 'El precio de venta debe ser un número' })
    .nonnegative('El precio de venta no puede ser negativo')
    .default(0)
    .optional(),
  stockActual: z
    .number({ message: 'El stock actual debe ser un número' })
    .int('El stock debe ser un número entero')
    .nonnegative('El stock no puede ser negativo')
    .default(0)
    .optional(),
  stockMinimo: z
    .number({ message: 'El stock mínimo debe ser un número' })
    .int('El stock mínimo debe ser un número entero')
    .min(0, 'El stock mínimo no puede ser negativo')
    .default(0)
    .optional(),
  esServicio: z.boolean().default(false).optional(),
  requiereSerie: z.boolean().default(false).optional(),
  garantiaProveedorMeses: z
    .number({ message: 'La garantía del proveedor debe ser un número' })
    .int('La garantía del proveedor debe ser un número entero')
    .min(0, 'La garantía del proveedor no puede ser negativa')
    .default(0)
    .optional(),
  garantiaClienteMeses: z
    .number({ message: 'La garantía del cliente debe ser un número' })
    .int('La garantía del cliente debe ser un número entero')
    .min(0, 'La garantía del cliente no puede ser negativa')
    .default(0)
    .optional(),
});

export const productoValidator = {
  crear: [
    validate(crearProductoSchema),
    validarCategoriaExiste,
    validarMarcaExiste,
    validarUbicacionExiste,
    validarProductoPadre,
  ],
  crearRapido: [
    validate(crearProductoRapidoSchema),
    validarCategoriaExiste,
    validarMarcaExiste,
    validarUbicacionExiste,
  ],
  actualizar: [
    validate(actualizarProductoSchema),
    validarCategoriaExiste,
    validarMarcaExiste,
    validarUbicacionExiste,
    validarProductoPadre,
  ],
  ajustarStock: validate(ajustarStockSchema),
  validarId: validateId,
  validarBusqueda: validateBusqueda,
};
