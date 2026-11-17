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

interface AuthCacheEntry {
  usuario: {
    id: string;
    username: string;
    rol: string;
  };
  expiresAt: number;
}

const AUTH_CACHE_TTL_MS = 60_000;
const AUTH_CACHE_MAX_SIZE = 1000;
const authUserCache = new Map<string, AuthCacheEntry>();

export function invalidateAuthUserCache(userId?: string): void {
  if (userId) {
    authUserCache.delete(userId);
    return;
  }
  authUserCache.clear();
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

    const now = Date.now();
    const cached = authUserCache.get(decoded.userId);
    let usuario = cached && cached.expiresAt > now ? cached.usuario : null;

    if (!usuario) {
      // Verificar que el usuario exista físicamente en la base de datos
      usuario = await prisma.usuario.findUnique({
        where: { id: decoded.userId },
        select: { id: true, username: true, rol: true },
      });

      if (!usuario) {
        authUserCache.delete(decoded.userId);
        res.status(401).json({
          success: false,
          error: 'Sesión obsoleta o usuario no encontrado. Por favor inicia sesión nuevamente.',
        });
        return;
      }

      if (authUserCache.size >= AUTH_CACHE_MAX_SIZE) {
        authUserCache.clear();
      }

      authUserCache.set(decoded.userId, {
        usuario,
        expiresAt: now + AUTH_CACHE_TTL_MS,
      });
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

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.userRole !== 'ADMIN') {
    res.status(403).json({
      success: false,
      error: 'Acceso denegado: se requiere rol ADMIN',
    });
    return;
  }

  next();
};
