import { Request, Response, NextFunction } from 'express';
import { serieService } from '../services/serie.service';
import { EstadoSerie } from '@prisma/client';

export class SerieController {
  /**
   * GET /api/series/verificar/:numeroSerie
   * Verificar si un número de serie está disponible
   */
  async verificarDisponibilidad(req: Request, res: Response, next: NextFunction) {
    try {
      const numeroSerie = req.params.numeroSerie as string;
      const disponible = await serieService.verificarDisponibilidad(numeroSerie);

      res.json({
        success: true,
        data: {
          numeroSerie,
          disponible,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/series/producto/:productoId
   * Obtener todas las series de un producto
   */
  async obtenerSeriesPorProducto(req: Request, res: Response, next: NextFunction) {
    try {
      const productoId = req.params.productoId as string;
      const { estado } = req.query;

      const series = await serieService.obtenerSeriesPorProducto(
        productoId,
        estado as EstadoSerie | undefined
      );

      res.json({
        success: true,
        data: series,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/series/producto/:productoId/disponibles
   * Obtener solo series disponibles de un producto
   */
  async obtenerSeriesDisponibles(req: Request, res: Response, next: NextFunction) {
    try {
      const productoId = req.params.productoId as string;
      const series = await serieService.obtenerSeriesDisponibles(productoId);

      res.json({
        success: true,
        data: series,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/series/buscar/:numeroSerie
   * Buscar información completa de una serie
   */
  async buscarPorNumeroSerie(req: Request, res: Response, next: NextFunction) {
    try {
      const numeroSerie = req.params.numeroSerie as string;
      const serie = await serieService.buscarPorNumeroSerie(numeroSerie);

      if (!serie) {
        return res.status(404).json({
          success: false,
          message: 'Número de serie no encontrado',
        });
      }

      res.json({
        success: true,
        data: serie,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/series/garantia/:numeroSerie
   * Verificar estado de garantía de un producto
   */
  async verificarGarantia(req: Request, res: Response, next: NextFunction) {
    try {
      const numeroSerie = req.params.numeroSerie as string;
      const resultado = await serieService.verificarGarantia(numeroSerie);

      res.json({
        success: true,
        data: resultado,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/series/producto/:productoId/estadisticas
   * Obtener conteo de series por estado
   */
  async obtenerEstadisticas(req: Request, res: Response, next: NextFunction) {
    try {
      const productoId = req.params.productoId as string;
      const estadisticas = await serieService.contarSeriesPorEstado(productoId);

      res.json({
        success: true,
        data: estadisticas,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/series/:numeroSerie/estado
   * Cambiar estado de una serie
   */
  async cambiarEstado(req: Request, res: Response, next: NextFunction) {
    try {
      const numeroSerie = req.params.numeroSerie as string;
      const { estado } = req.body;

      if (!Object.values(EstadoSerie).includes(estado)) {
        return res.status(400).json({
          success: false,
          message: `Estado inválido. Valores permitidos: ${Object.values(EstadoSerie).join(', ')}`,
        });
      }

      const serie = await serieService.cambiarEstado(numeroSerie, estado);

      res.json({
        success: true,
        data: serie,
        message: `Estado actualizado a ${estado}`,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new SerieController();
