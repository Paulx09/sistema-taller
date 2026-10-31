import { Request, Response, NextFunction } from 'express';
import ventaService from '../services/venta.service';

class VentaController {
  // GET /api/ventas
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const { desde, hasta, page, limit } = req.query;

      const skip = page ? (Number(page) - 1) * (Number(limit) || 50) : 0;
      const take = Number(limit) || 50;

      // Crear fechas en hora local (no UTC) para evitar problemas de zona horaria
      let fechaDesde: Date | undefined = undefined;
      if (desde) {
        const [year, month, day] = (desde as string).split('-').map(Number);
        fechaDesde = new Date(year, month - 1, day, 0, 0, 0, 0);
      }

      let fechaHasta: Date | undefined = undefined;
      if (hasta) {
        const [year, month, day] = (hasta as string).split('-').map(Number);
        // Agregar 1 día para incluir todo el día seleccionado
        fechaHasta = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
      }

      const filtros = {
        desde: fechaDesde,
        hasta: fechaHasta,
        skip,
        take,
      };

      const { ventas, total } = await ventaService.listar(filtros);

      res.json({
        success: true,
        data: ventas,
        total,
        page: Number(page) || 1,
        totalPages: Math.ceil(total / take),
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/ventas/hoy
  async listarHoy(req: Request, res: Response, next: NextFunction) {
    try {
      const { ventas, total } = await ventaService.listarHoy();

      res.json({
        success: true,
        data: ventas,
        total,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/ventas/:id
  async obtenerUna(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const venta = await ventaService.obtenerPorId(id as string);

      res.json({
        success: true,
        data: venta,
      });
    } catch (error: any) {
      if (error.message === 'Venta no encontrada') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }

  // POST /api/ventas
  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const { clienteId, clienteNombre, metodoPago, detalles } = req.body;

      // req.userId viene del middleware requireAuth
      const venta = await ventaService.crear({
        clienteId,
        clienteNombre,
        metodoPago,
        detalles,
        usuarioId: req.userId!,
      });

      res.status(201).json({
        success: true,
        data: venta,
        mensaje: `Venta #${venta.codigoCorrelativo} registrada correctamente`,
      });
    } catch (error: any) {
      // Errores de negocio (stock insuficiente, producto no encontrado)
      if (
        error.message?.includes('Stock insuficiente') ||
        error.message?.includes('no encontrado')
      ) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
}

export const ventaController = new VentaController();
