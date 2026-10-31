import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

const crearEquipoSchema = z.object({
  tipoEquipoId: z.string().uuid().optional().nullable(),
  tipoEquipo: z.string()
    .max(50, 'El tipo de equipo no puede exceder 50 caracteres')
    .trim()
    .optional(),
  marcaId: z.string().uuid().optional().nullable(),
  marca: z.string()
    .max(50, 'La marca no puede exceder 50 caracteres')
    .trim()
    .optional()
    .nullable(),
  modelo: z.string()
    .max(50, 'El modelo no puede exceder 50 caracteres')
    .trim()
    .optional()
    .nullable(),
  numeroSerie: z.string()
    .max(100, 'El número de serie no puede exceder 100 caracteres')
    .trim()
    .optional()
    .nullable(),
  contrasenaPatron: z.string()
    .max(100, 'La contraseña/patrón no puede exceder 100 caracteres')
    .trim()
    .optional()
    .nullable(),
}).refine((data) => data.tipoEquipoId || data.tipoEquipo, {
  message: 'El tipo de equipo es requerido',
  path: ['tipoEquipo'],
});

const actualizarEquipoSchema = z.object({
  tipoEquipoId: z.string().uuid().optional().nullable(),
  tipoEquipo: z.string()
    .max(50, 'El tipo de equipo no puede exceder 50 caracteres')
    .trim()
    .optional(),
  marcaId: z.string().uuid().optional().nullable(),
  marca: z.string()
    .max(50, 'La marca no puede exceder 50 caracteres')
    .trim()
    .optional()
    .nullable(),
  modelo: z.string()
    .max(50, 'El modelo no puede exceder 50 caracteres')
    .trim()
    .optional()
    .nullable(),
  numeroSerie: z.string()
    .max(100, 'El número de serie no puede exceder 100 caracteres')
    .trim()
    .optional()
    .nullable(),
  contrasenaPatron: z.string()
    .max(100, 'La contraseña/patrón no puede exceder 100 caracteres')
    .trim()
    .optional()
    .nullable(),
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

export const equipoClienteValidator = {
  crear: validate(crearEquipoSchema),
  actualizar: validate(actualizarEquipoSchema),
  validateId,
};
