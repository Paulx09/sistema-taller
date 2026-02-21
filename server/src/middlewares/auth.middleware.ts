import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';

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

    // Adjuntar información del usuario al request
    req.userId = decoded.userId;
    req.username = decoded.username;
    req.userRole = decoded.rol;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Token inválido o expirado',
    });
  }
};
