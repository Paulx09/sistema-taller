import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Esquema de un equipo dentro de la orden
const equipoOrdenInputSchema = z.object({
  equipoId: z.string().uuid('equipoId debe ser un UUID válido'),
  problemaReportado: z.string().min(1, 'El problema reportado es requerido').trim(),
  diagnosticoTecnico: z.string().trim().optional().nullable(),
  observacionesEsteticas: z.record(z.string(), z.any()).optional().nullable(),
  costoEstimado: z.number().nonnegative('El costo estimado no puede ser negativo').optional().nullable(),
});

// Crear orden
const crearOrdenSchema = z.object({
  clienteId: z.string().uuid('clienteId debe ser un UUID válido'),
  usuarioTecnicoId: z.string().uuid('usuarioTecnicoId debe ser un UUID válido').optional().nullable(),
  pagoACuenta: z.number().min(0, 'El pago a cuenta no puede ser negativo').optional(),
  equipos: z.array(equipoOrdenInputSchema).min(1, 'La orden debe tener al menos un equipo'),
});

// Editar orden (solo campos globales)
const actualizarOrdenSchema = z.object({
  usuarioTecnicoId: z.string().uuid().optional().nullable(),
  pagoACuenta: z.number().min(0).optional(),
});

// Agregar / actualizar equipo en la orden
const agregarEquipoSchema = z.object({
  equipoId: z.string().uuid('equipoId debe ser un UUID válido'),
  problemaReportado: z.string().min(1, 'El problema reportado es requerido').trim(),
  diagnosticoTecnico: z.string().trim().optional().nullable(),
  observacionesEsteticas: z.record(z.string(), z.any()).optional().nullable(),
  costoEstimado: z.number().nonnegative('El costo estimado no puede ser negativo').optional().nullable(),
});

const actualizarEquipoSchema = z.object({
  problemaReportado: z.string().min(1).trim().optional(),
  diagnosticoTecnico: z.string().trim().optional().nullable(),
  observacionesEsteticas: z.record(z.string(), z.any()).optional().nullable(),
  costoEstimado: z.number().nonnegative().optional().nullable(),
});

// Cambiar estado de un equipo
const cambiarEstadoEquipoSchema = z.object({
  estado: z.enum(['RECIBIDA', 'EN_REPARACION', 'LISTA', 'CANCELADA'] as const, {
    error: 'Estado de equipo inválido',
  }),
});

// Agregar ítem
const agregarItemSchema = z.object({
  productoId: z.string().uuid('productoId debe ser un UUID válido'),
  cantidad: z.number().int().positive('La cantidad debe ser un entero positivo'),
  precioUnitario: z.number().positive('El precio unitario debe ser positivo'),
});

// Actualizar cantidad de ítem
const actualizarItemSchema = z.object({
  cantidad: z.number().int().positive('La cantidad debe ser un entero positivo'),
});

// Cambiar estado global de la orden (solo ENTREGADA)
const cambiarEstadoSchema = z.object({
  estado: z.literal('ENTREGADA', { error: 'Solo se puede cambiar el estado global a ENTREGADA' }),
});

// Param ID
const idParamSchema = z.object({
  id: z.string().uuid('El ID debe ser un UUID válido'),
});

// Helper
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
  agregarEquipo: validate(agregarEquipoSchema),
  actualizarEquipo: validate(actualizarEquipoSchema),
  cambiarEstadoEquipo: validate(cambiarEstadoEquipoSchema),
  agregarItem: validate(agregarItemSchema),
  actualizarItem: validate(actualizarItemSchema),
  cambiarEstado: validate(cambiarEstadoSchema),
  validateId,
};
