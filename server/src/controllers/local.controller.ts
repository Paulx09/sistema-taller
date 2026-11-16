import type { Request, Response, NextFunction } from 'express';
import localService from '../services/local.service';

class LocalController {
  // GET /api/locales
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const locales = await localService.listarActivos();

      res.json({
        success: true,
        data: locales,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const localController = new LocalController();
export default localController;
