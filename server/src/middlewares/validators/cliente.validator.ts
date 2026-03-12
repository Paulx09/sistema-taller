import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

const crearClienteSchema = z.object({
  nombre: z.string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  dniRuc: z.string()
    .trim()
    .refine(
      (val) => val.length === 8 || val.length === 11,
      { message: 'El DNI debe tener 8 dígitos o el RUC 11 dígitos' }
    )
    .refine(
      (val) => /^\d+$/.test(val),
      { message: 'El DNI/RUC solo debe contener números' }
    )
    .optional()
    .nullable(),
  telefono: z.string()
    .max(20, 'El teléfono no puede exceder 20 caracteres')
    .trim()
    .optional()
    .nullable(),
  direccion: z.string()
    .trim()
    .optional()
    .nullable(),
});

const actualizarClienteSchema = z.object({
  nombre: z.string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim()
    .optional(),
  dniRuc: z.string()
    .trim()
    .refine(
      (val) => val.length === 8 || val.length === 11,
      { message: 'El DNI debe tener 8 dígitos o el RUC 11 dígitos' }
    )
    .refine(
      (val) => /^\d+$/.test(val),
      { message: 'El DNI/RUC solo debe contener números' }
    )
    .optional()
    .nullable(),
  telefono: z.string()
    .max(20, 'El teléfono no puede exceder 20 caracteres')
    .trim()
    .optional()
    .nullable(),
  direccion: z.string()
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

export const clienteValidator = {
  crear: validate(crearClienteSchema),
  actualizar: validate(actualizarClienteSchema),
  validateId,
};
