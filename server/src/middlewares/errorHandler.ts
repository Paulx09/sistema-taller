import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

// Interfaz para errores personalizados
interface CustomError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: CustomError | ZodError | Prisma.PrismaClientKnownRequestError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  // Error de validación de Zod
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validación fallida',
      details: err.issues.map((e) => ({
        campo: e.path.join('.'),
        mensaje: e.message
      }))
    });
  }

  // Errores de Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Error de clave única duplicada
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: 'Ya existe un registro con ese valor',
        campo: (err.meta?.target as string[])?.join(', ')
      });
    }

    // Error de registro no encontrado
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'Registro no encontrado'
      });
    }

    // Error de restricción de clave foránea
    if (err.code === 'P2003') {
      return res.status(400).json({
        error: 'Referencia inválida',
        mensaje: 'El registro relacionado no existe'
      });
    }
  }

  // Error personalizado con statusCode
  const statusCode = (err as CustomError).statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Middleware para rutas no encontradas
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    ruta: req.originalUrl
  });
};
