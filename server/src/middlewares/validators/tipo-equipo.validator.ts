import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Esquema para crear tipo de equipo
const crearTipoEquipoSchema = z.object({
  nombre: z.string()
    .min(1, 'El nombre es requerido')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .trim(),
  requiereClave: z.boolean().optional().default(false),
});

// Esquema para actualizar tipo de equipo
const actualizarTipoEquipoSchema = z.object({
  nombre: z.string()
    .min(1, 'El nombre es requerido')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .trim()
    .optional(),
  requiereClave: z.boolean().optional(),
  activo: z.boolean().optional(),
});

// Esquema para validar ID (UUID)
const idParamSchema = z.object({
  id: z.string().uuid('El ID debe ser un UUID válido'),
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

export const tipoEquipoValidator = {
  crear: validate(crearTipoEquipoSchema),
  actualizar: validate(actualizarTipoEquipoSchema),
  validarId: validateId,
};
