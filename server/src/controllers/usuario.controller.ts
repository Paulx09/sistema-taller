import type { Request, Response, NextFunction } from 'express';
import usuarioService, { UsuarioServiceError } from '../services/usuario.service';

class UsuarioController {
  // GET /api/usuarios
  async listar(_req: Request, res: Response, next: NextFunction) {
    try {
      const usuarios = await usuarioService.listar();
      res.json({
        success: true,
        data: usuarios,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/usuarios
  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, nombreCompleto, password, rol } = req.body;
      const usuario = await usuarioService.crear({
        username,
        nombreCompleto,
        password,
        rol,
      });

      res.status(201).json({
        success: true,
        data: usuario,
        mensaje: 'Usuario creado exitosamente',
      });
    } catch (error) {
      if (error instanceof UsuarioServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }

  // PATCH /api/usuarios/:id
  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { username, nombreCompleto, rol } = req.body;
      const usuario = await usuarioService.actualizar(id as string, {
        username,
        nombreCompleto,
        rol,
      });

      res.json({
        success: true,
        data: usuario,
        mensaje: 'Usuario actualizado exitosamente',
      });
    } catch (error) {
      if (error instanceof UsuarioServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }

  // PATCH /api/usuarios/:id/password
  async cambiarPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      await usuarioService.cambiarPassword(id as string, newPassword);

      res.json({
        success: true,
        mensaje: 'Contraseña actualizada correctamente',
      });
    } catch (error) {
      if (error instanceof UsuarioServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }
}

export const usuarioController = new UsuarioController();
export default usuarioController;
