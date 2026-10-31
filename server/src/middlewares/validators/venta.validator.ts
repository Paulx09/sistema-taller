import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

const detalleVentaSchema = z.object({
  productoId: z.string().min(1, 'El ID del producto es requerido'),
  cantidad: z
    .number({ message: 'La cantidad debe ser un número' })
    .int('La cantidad debe ser un número entero')
    .positive('La cantidad debe ser mayor a 0'),
  precioUnitario: z
    .number({ message: 'El precio unitario debe ser un número' })
    .positive('El precio unitario debe ser mayor a 0'),
});

const crearVentaSchema = z.object({
  clienteId: z.string().uuid().optional().nullable(),
  clienteNombre: z.string().max(100).trim().optional().nullable(),
  metodoPago: z
    .enum(['EFECTIVO', 'TARJETA', 'YAPE_PLIN'], {
      message: 'Método de pago inválido. Debe ser EFECTIVO, TARJETA o YAPE_PLIN',
    })
    .default('EFECTIVO'),
  detalles: z
    .array(detalleVentaSchema)
    .min(1, 'La venta debe tener al menos un producto'),
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

export const ventaValidator = {
  crear: validate(crearVentaSchema),
};
