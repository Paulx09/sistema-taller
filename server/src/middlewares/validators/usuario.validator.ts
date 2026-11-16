import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

const ROLES_GESTIONABLES = ['ADMIN', 'VENDEDOR'] as const;

const usernameSchema = z
  .string({ error: 'El username es requerido' })
  .trim()
  .min(3, 'El username debe tener al menos 3 caracteres')
  .max(50, 'El username no puede exceder 50 caracteres')
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    'El username solo puede contener letras, números, puntos, guiones y guiones bajos'
  );

const nombreCompletoSchema = z
  .string({ error: 'El nombre completo es requerido' })
  .trim()
  .min(2, 'El nombre completo debe tener al menos 2 caracteres')
  .max(100, 'El nombre completo no puede exceder 100 caracteres');

const passwordSchema = z
  .string({ error: 'La contraseña es requerida' })
  .min(6, 'La contraseña debe tener al menos 6 caracteres')
  .max(100, 'La contraseña no puede exceder 100 caracteres');

const rolSchema = z.enum(ROLES_GESTIONABLES, {
  error: 'El rol debe ser ADMIN o VENDEDOR',
});

const crearUsuarioSchema = z.object({
  username: usernameSchema,
  nombreCompleto: nombreCompletoSchema,
  password: passwordSchema,
  rol: rolSchema.optional().default('ADMIN'),
});

const actualizarUsuarioSchema = z
  .object({
    username: usernameSchema.optional(),
    nombreCompleto: nombreCompletoSchema.optional(),
    rol: rolSchema.optional(),
  })
  .refine(
    (data) =>
      data.username !== undefined ||
      data.nombreCompleto !== undefined ||
      data.rol !== undefined,
    { message: 'Debe proporcionar al menos un campo para actualizar' }
  );

const cambiarPasswordSchema = z.object({
  newPassword: passwordSchema,
});

const idParamSchema = z.object({
  id: z.string().uuid('El ID debe ser un UUID válido'),
});

const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validación fallida',
          details: error.issues.map((issue) => ({
            campo: issue.path.join('.'),
            mensaje: issue.message,
          })),
        });
        return;
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
      res.status(400).json({
        success: false,
        error: 'ID inválido',
        mensaje: 'El ID debe ser un UUID válido',
      });
      return;
    }
    next(error);
  }
};

export const usuarioValidator = {
  crear: validateBody(crearUsuarioSchema),
  actualizar: validateBody(actualizarUsuarioSchema),
  cambiarPassword: validateBody(cambiarPasswordSchema),
  validateId,
};
