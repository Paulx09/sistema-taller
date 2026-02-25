import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';

const crearProductoSchema = z
  .object({
    nombre: z
      .string()
      .min(1, 'El nombre es requerido')
      .max(150, 'El nombre no puede exceder 150 caracteres')
      .trim(),
    marca: z.string().max(50, 'La marca no puede exceder 50 caracteres').trim().optional(),
    modelo: z.string().max(50, 'El modelo no puede exceder 50 caracteres').trim().optional(),
    sku: z.string().max(50, 'El SKU no puede exceder 50 caracteres').trim().optional(),
    codigoBarras: z
      .string()
      .max(50, 'El código de barras no puede exceder 50 caracteres')
      .trim()
      .optional(),
    descripcion: z
      .string()
      .max(255, 'La descripción no puede exceder 255 caracteres')
      .trim()
      .optional(),
    categoriaId: z.string().min(1, 'El ID de categoría es requerido'),
    ubicacionId: z.string().min(1).optional(),
    precioCompra: z
      .number({ message: 'El precio de compra debe ser un número' })
      .nonnegative('El precio de compra no puede ser negativo')
      .max(9999999.99, 'El precio de compra excede el límite'),
    precioVenta: z
      .number({ message: 'El precio de venta debe ser un número' })
      .positive('El precio de venta debe ser mayor a 0')
      .max(9999999.99, 'El precio de venta excede el límite'),
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
      .default(1)
      .optional(),
    imagenUrl: z.string().optional().or(z.literal('')),
    specs: z.record(z.string(), z.any()).optional(),
    esServicio: z.boolean().default(false).optional(), // Si esServicio = true, ubicación no es obligatoria
    esSegundaMano: z.boolean().default(false).optional(),
    padreId: z.string().min(1).optional(),
  })
  .refine((data) => data.precioVenta > data.precioCompra, {
    message: 'El precio de venta debe ser mayor al precio de compra (no se puede vender a pérdida)',
    path: ['precioVenta'],
  })
  .refine((data) => data.esServicio || data.ubicacionId !== undefined, {
    message: 'Los productos físicos (no servicios) deben tener una ubicación asignada',
    path: ['ubicacionId'],
  });

// EXCLUYE stockActual para mantener trazabilidad - El stock SOLO puede modificarse mediante PATCH /stock
const actualizarProductoSchema = z
  .object({
    nombre: z
      .string()
      .min(1, 'El nombre es requerido')
      .max(150, 'El nombre no puede exceder 150 caracteres')
      .trim()
      .optional(),
    marca: z.string().max(50, 'La marca no puede exceder 50 caracteres').trim().optional(),
    modelo: z.string().max(50, 'El modelo no puede exceder 50 caracteres').trim().optional(),
    sku: z.string().max(50, 'El SKU no puede exceder 50 caracteres').trim().optional(),
    codigoBarras: z
      .string()
      .max(50, 'El código de barras no puede exceder 50 caracteres')
      .trim()
      .optional(),
    descripcion: z
      .string()
      .max(255, 'La descripción no puede exceder 255 caracteres')
      .trim()
      .optional(),
    categoriaId: z.string().min(1).optional(),
    ubicacionId: z.string().min(1).optional(),
    precioCompra: z
      .number({ message: 'El precio de compra debe ser un número' })
      .nonnegative('El precio de compra no puede ser negativo')
      .max(9999999.99, 'El precio de compra excede el límite')
      .optional(),
    precioVenta: z
      .number({ message: 'El precio de venta debe ser un número' })
      .positive('El precio de venta debe ser mayor a 0')
      .max(9999999.99, 'El precio de venta excede el límite')
      .optional(),
    stockMinimo: z
      .number({ message: 'El stock mínimo debe ser un número' })
      .int('El stock mínimo debe ser un número entero')
      .min(0, 'El stock mínimo no puede ser negativo')
      .optional(),
    imagenUrl: z.string().optional().or(z.literal('')),
    specs: z.record(z.string(), z.any()).optional(),
    esServicio: z.boolean().optional(),
    esSegundaMano: z.boolean().optional(),
    padreId: z.string().min(1).optional(),
  })
  .strict() // Rechaza campos no definidos
  .refine(
    (data) => {
      if (data.precioVenta !== undefined && data.precioCompra !== undefined) {
        return data.precioVenta > data.precioCompra;
      }
      return true;
    },
    {
      message: 'El precio de venta debe ser mayor al precio de compra',
      path: ['precioVenta'],
    }
  );

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
      schema.parse(req.body);
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

// Validación de negocio: Verificar que ubicación existe (si no es servicio)
const validarUbicacionExiste = async (req: Request, res: Response, next: NextFunction) => {
  const { ubicacionId, esServicio } = req.body;

  // Si es servicio, la ubicación no es obligatoria
  if (esServicio || !ubicacionId) {
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

  // Si es update, verificar que no se asigne a sí mismo como padre
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

    if (padre.esServicio) {
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

export const productoValidator = {
  crear: [validate(crearProductoSchema), validarCategoriaExiste, validarUbicacionExiste, validarProductoPadre],
  actualizar: [
    validate(actualizarProductoSchema),
    validarCategoriaExiste,
    validarUbicacionExiste,
    validarProductoPadre,
  ],
  ajustarStock: validate(ajustarStockSchema),
  validarId: validateId,
  validarBusqueda: validateBusqueda,
};
