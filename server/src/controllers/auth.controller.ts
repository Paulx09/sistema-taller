import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';

class AuthController {
  // POST /api/auth/login
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body;

      // Validación básica
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Usuario y contraseña son requeridos',
        });
      }

      const authResponse = await authService.login({ username, password });

      res.json({
        success: true,
        data: authResponse,
      });
    } catch (error: any) {
      if (error.message === 'Credenciales inválidas') {
        return res.status(401).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }

  // GET /api/auth/usuarios
  async listarUsuarios(req: Request, res: Response, next: NextFunction) {
    try {
      const usuarios = await authService.listarUsuarios();
      res.json({ success: true, data: usuarios });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/auth/me (opcional - para verificar sesión)
  async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      // El middleware requireAuth ya validó el token y adjuntó userId
      res.json({
        success: true,
        data: {
          userId: req.userId,
          username: req.username,
          rol: req.userRole,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
