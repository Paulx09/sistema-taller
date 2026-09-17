import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import prisma from '../config/database';

// Extender Request para incluir userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      username?: string;
      userRole?: string;
    }
  }
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Obtener token del header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Token no proporcionado',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verificar y decodificar token
    const decoded = authService.verifyToken(token);

    // Verificar que el usuario exista físicamente en la base de datos
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, rol: true },
    });

    if (!usuario) {
      res.status(401).json({
        success: false,
        error: 'Sesión obsoleta o usuario no encontrado. Por favor inicia sesión nuevamente.',
      });
      return;
    }

    // Adjuntar información del usuario verificado al request
    req.userId = usuario.id;
    req.username = usuario.username;
    req.userRole = usuario.rol;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Token inválido o expirado',
    });
  }
};
