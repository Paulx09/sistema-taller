import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Esquema para crear ubicación
const crearUbicacionSchema = z.object({
  nombre: z.string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  descripcion: z.string()
    .max(255, 'La descripción no puede exceder 255 caracteres')
    .trim()
    .optional()
});

// Esquema para actualizar ubicación
const actualizarUbicacionSchema = z.object({
  nombre: z.string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim()
    .optional(),
  descripcion: z.string()
    .max(255, 'La descripción no puede exceder 255 caracteres')
    .trim()
    .optional()
}).refine(data => data.nombre || data.descripcion, {
  message: 'Debe proporcionar al menos un campo para actualizar'
});

// Esquema para validar ID de parámetro (UUID)
const idParamSchema = z.object({
  id: z.uuid('El ID debe ser un UUID válido')
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
            mensaje: issue.message
          }))
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
        mensaje: 'El ID debe ser un UUID válido'
      });
    }
    next(error);
  }
};

export const ubicacionValidator = {
  crear: validate(crearUbicacionSchema),
  actualizar: validate(actualizarUbicacionSchema),
  validarId: validateId
};
