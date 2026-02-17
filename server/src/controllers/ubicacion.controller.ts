import { Request, Response, NextFunction } from 'express';
import ubicacionService from '../services/ubicacion.service';

export class UbicacionController {
  // GET /api/ubicaciones
  async listarTodas(req: Request, res: Response, next: NextFunction) {
    try {
      const ubicaciones = await ubicacionService.listarTodas();
      res.json({
        success: true,
        data: ubicaciones,
        total: ubicaciones.length
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/ubicaciones/:id
  async obtenerPorId(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number.parseInt(req.params.id as string, 10);
      const ubicacion = await ubicacionService.obtenerPorId(id);

      if (!ubicacion) {
        return res.status(404).json({
          success: false,
          error: 'Ubicación no encontrada'
        });
      }

      res.json({
        success: true,
        data: ubicacion
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/ubicaciones
  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const ubicacion = await ubicacionService.crear(req.body);
      res.status(201).json({
        success: true,
        data: ubicacion,
        mensaje: 'Ubicación creada exitosamente'
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/ubicaciones/:id
  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number.parseInt(req.params.id as string, 10);
      const ubicacion = await ubicacionService.actualizar(id, req.body);
      res.json({
        success: true,
        data: ubicacion,
        mensaje: 'Ubicación actualizada exitosamente'
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/ubicaciones/:id
  async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number.parseInt(req.params.id as string, 10);
      await ubicacionService.eliminar(id);
      res.json({
        success: true,
        mensaje: 'Ubicación eliminada exitosamente'
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new UbicacionController();
