import type { Request, Response, NextFunction } from 'express';
import dashboardService from '../services/dashboard.service';

class DashboardController {
  // GET /api/dashboard/metricas
  async obtenerMetricas(req: Request, res: Response, next: NextFunction) {
    try {
      const metricas = await dashboardService.obtenerMetricas();

      res.json({
        success: true,
        data: metricas,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
