import type { Request, Response, NextFunction } from 'express';
import dashboardService from '../services/dashboard.service';

class DashboardController {
  // GET /api/dashboard/metricas
  async obtenerMetricas(req: Request, res: Response, next: NextFunction) {
    try {
      const { localId, mes: rawMes, anio: rawAnio } = req.query;

      let mes: number | undefined;
      if (rawMes !== undefined && rawMes !== '') {
        mes = Number(rawMes);
        if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
          return res.status(400).json({
            success: false,
            error: 'El parámetro mes debe ser un número entero entre 1 y 12',
          });
        }
      }

      let anio: number | undefined;
      if (rawAnio !== undefined && rawAnio !== '') {
        anio = Number(rawAnio);
        if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
          return res.status(400).json({
            success: false,
            error: 'El parámetro anio debe ser un año válido',
          });
        }
      }

      const metricas = await dashboardService.obtenerMetricas({
        localId: typeof localId === 'string' && localId.trim() ? localId.trim() : undefined,
        mes,
        anio,
      });

      res.json({
        success: true,
        data: metricas,
      });
    } catch (error: any) {
      if (error.statusCode === 400) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
