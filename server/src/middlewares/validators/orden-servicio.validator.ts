import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Crear orden (wizard paso 3)
const crearOrdenSchema = z.object({
  clienteId: z.string().uuid('clienteId debe ser un UUID válido'),
  equipoId: z.string().uuid('equipoId debe ser un UUID válido'),
  usuarioTecnicoId: z.string().uuid('usuarioTecnicoId debe ser un UUID válido').optional().nullable(),
  problemaReportado: z.string().min(1, 'El problema reportado es requerido').trim(),
  diagnosticoInicial: z.string().trim().optional().nullable(),
  observacionesEsteticas: z.record(z.string(), z.any()).optional().nullable(),
  costoEstimado: z.number().positive('El costo estimado debe ser positivo').optional().nullable(),
  pagoACuenta: z.number().min(0, 'El pago a cuenta no puede ser negativo').optional(),
});

// Editar campos generales de la orden
const actualizarOrdenSchema = z.object({
  usuarioTecnicoId: z.string().uuid().optional().nullable(),
  diagnosticoInicial: z.string().trim().optional().nullable(),
  observacionesEsteticas: z.record(z.string(), z.any()).optional().nullable(),
  costoEstimado: z.number().positive().optional().nullable(),
  pagoACuenta: z.number().min(0).optional(),
  problemaReportado: z.string().min(1).trim().optional(),
});

// Agregar ítem a orden
const agregarItemSchema = z.object({
  productoId: z.string().uuid('productoId debe ser un UUID válido'),
  cantidad: z.number().int().positive('La cantidad debe ser un entero positivo'),
  precioUnitario: z.number().positive('El precio unitario debe ser positivo'),
});

// Cambiar estado
const cambiarEstadoSchema = z.object({
  estado: z.enum(['RECIBIDA', 'EN_REPARACION', 'LISTA', 'ENTREGADA', 'CANCELADA'] as const, {
    error: 'Estado inválido',
  }),
});

const idParamSchema = z.object({
  id: z.string().uuid('El ID debe ser un UUID válido'),
});

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

export const ordenServicioValidator = {
  crear: validate(crearOrdenSchema),
  actualizar: validate(actualizarOrdenSchema),
  agregarItem: validate(agregarItemSchema),
  cambiarEstado: validate(cambiarEstadoSchema),
  validateId,
};
