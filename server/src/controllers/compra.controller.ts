import { Request, Response, NextFunction } from 'express';
import compraService from '../services/compra.service';

class CompraController {
  // GET /api/compras
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const { proveedorId, desde, hasta, page, limit } = req.query;

      const skip = page ? (Number(page) - 1) * (Number(limit) || 50) : 0;
      const take = Number(limit) || 50;

      // Crear fechas en hora local para evitar problemas de zona horaria
      let fechaDesde: Date | undefined = undefined;
      if (desde) {
        const [year, month, day] = (desde as string).split('-').map(Number);
        fechaDesde = new Date(year, month - 1, day, 0, 0, 0, 0);
      }

      let fechaHasta: Date | undefined = undefined;
      if (hasta) {
        const [year, month, day] = (hasta as string).split('-').map(Number);
        fechaHasta = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
      }

      const filtros = {
        proveedorId: proveedorId as string,
        desde: fechaDesde,
        hasta: fechaHasta,
        skip,
        take,
      };

      const { compras, total } = await compraService.listar(filtros);

      res.json({
        success: true,
        data: compras,
        total,
        page: Number(page) || 1,
        totalPages: Math.ceil(total / take),
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/compras/:id
  async obtenerUna(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const compra = await compraService.obtenerPorId(id as string);

      res.json({
        success: true,
        data: compra,
      });
    } catch (error: any) {
      if (error.message === 'Compra no encontrada') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }

  // POST /api/compras
  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const { proveedorId, numeroFactura, fechaCompra, detalles } = req.body;

      // Validaciones básicas
      if (!proveedorId || !numeroFactura || !detalles || detalles.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Faltan datos requeridos: proveedorId, numeroFactura y detalles son obligatorios',
        });
      }

      // Validar formato de detalles
      for (const detalle of detalles) {
        if (!detalle.productoId || !detalle.cantidad || !detalle.costoUnitario) {
          return res.status(400).json({
            success: false,
            error: 'Cada detalle debe tener: productoId, cantidad y costoUnitario',
          });
        }
      }

      // Validar suma de totales (opcional pero recomendado)
      if (req.body.totalCompra) {
        const sumaCalculada = detalles.reduce((sum: number, d: any) => {
          return sum + d.cantidad * d.costoUnitario;
        }, 0);

        const diferencia = Math.abs(sumaCalculada - req.body.totalCompra);
        if (diferencia > 0.01) {
          return res.status(400).json({
            success: false,
            error: `El total de la factura (${req.body.totalCompra}) no coincide con la suma de subtotales (${sumaCalculada.toFixed(2)})`,
          });
        }
      }

      const compra = await compraService.crear({
        proveedorId,
        numeroFactura: numeroFactura.trim(),
        fechaCompra: fechaCompra ? new Date(fechaCompra) : undefined,
        detalles,
        usuarioId: req.userId!, // Del middleware requireAuth
      });

      res.status(201).json({
        success: true,
        data: compra,
        mensaje: 'Compra registrada exitosamente. Stock y costos actualizados.',
      });
    } catch (error: any) {
      // Error de constraint único (factura duplicada)
      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          error: 'Ya existe una compra con este número de factura para este proveedor',
        });
      }

      if (
        error.message.includes('no encontrado') ||
        error.message.includes('debe ser mayor') ||
        error.message.includes('debe tener al menos')
      ) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      next(error);
    }
  }

  // DELETE /api/compras/:id
  async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const resultado = await compraService.eliminar(id as string);

      res.json({
        success: true,
        ...resultado,
      });
    } catch (error: any) {
      if (error.message === 'Compra no encontrada') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
}

export const compraController = new CompraController();
