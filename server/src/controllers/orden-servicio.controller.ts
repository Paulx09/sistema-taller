import { Request, Response, NextFunction } from 'express';
import ordenServicioService from '../services/orden-servicio.service';
import { EstadoOrden } from '@prisma/client';

class OrdenServicioController {
  // GET /api/ordenes-servicio
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const { estado, clienteId, usuarioTecnicoId, desde, hasta, page, limit } = req.query;

      const take = Number(limit) || 50;
      const skip = page ? (Number(page) - 1) * take : 0;

      const { ordenes, total } = await ordenServicioService.listar({
        estado: estado as EstadoOrden | undefined,
        clienteId: clienteId as string | undefined,
        usuarioTecnicoId: usuarioTecnicoId as string | undefined,
        desde: desde ? new Date(desde as string) : undefined,
        hasta: hasta ? new Date(hasta as string) : undefined,
        skip,
        take,
      });

      res.json({
        success: true,
        data: ordenes,
        total,
        page: Number(page) || 1,
        totalPages: Math.ceil(total / take),
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/ordenes-servicio/:id
  async obtenerUno(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const orden = await ordenServicioService.obtenerPorId(id as string);
      res.json({ success: true, data: orden });
    } catch (error: any) {
      if (error.message === 'Orden de servicio no encontrada') {
        return res.status(404).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // POST /api/ordenes-servicio
  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        clienteId,
        equipoId,
        usuarioTecnicoId,
        problemaReportado,
        diagnosticoInicial,
        observacionesEsteticas,
        costoEstimado,
        pagoACuenta,
      } = req.body;

      const usuarioRegistroId = req.userId!;

      const orden = await ordenServicioService.crear({
        clienteId,
        equipoId,
        usuarioRegistroId,
        usuarioTecnicoId: usuarioTecnicoId ?? null,
        problemaReportado: problemaReportado.trim(),
        diagnosticoInicial: diagnosticoInicial?.trim() ?? null,
        observacionesEsteticas: observacionesEsteticas ?? null,
        costoEstimado: costoEstimado ?? null,
        pagoACuenta: pagoACuenta ?? 0,
      });

      res.status(201).json({
        success: true,
        data: orden,
        mensaje: 'Orden de servicio creada exitosamente',
      });
    } catch (error: any) {
      const notFoundErrors = ['Cliente no encontrado', 'Equipo no encontrado', 'Técnico no encontrado'];
      if (notFoundErrors.some((msg) => error.message.includes(msg))) {
        return res.status(404).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // PUT /api/ordenes-servicio/:id
  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { usuarioTecnicoId, diagnosticoInicial, observacionesEsteticas, costoEstimado, pagoACuenta, problemaReportado } =
        req.body;

      const orden = await ordenServicioService.actualizar(id as string, {
        usuarioTecnicoId,
        diagnosticoInicial,
        observacionesEsteticas,
        costoEstimado,
        pagoACuenta,
        problemaReportado,
      });

      res.json({
        success: true,
        data: orden,
        mensaje: 'Orden actualizada exitosamente',
      });
    } catch (error: any) {
      if (error.message === 'Orden de servicio no encontrada') {
        return res.status(404).json({ success: false, error: error.message });
      }
      if (error.message.includes('No se puede editar')) {
        return res.status(400).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // POST /api/ordenes-servicio/:id/items
  async agregarItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { productoId, cantidad, precioUnitario } = req.body;
      const usuarioId = req.userId!;

      const orden = await ordenServicioService.agregarItem(
        id as string,
        { productoId, cantidad, precioUnitario },
        usuarioId,
      );

      res.status(201).json({
        success: true,
        data: orden,
        mensaje: 'Ítem agregado exitosamente',
      });
    } catch (error: any) {
      if (error.message.includes('no encontrada') || error.message.includes('no encontrado')) {
        return res.status(404).json({ success: false, error: error.message });
      }
      if (error.message.includes('Stock insuficiente') || error.message.includes('No se puede agregar')) {
        return res.status(400).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // DELETE /api/ordenes-servicio/:id/items/:itemId
  async quitarItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, itemId } = req.params;
      const usuarioId = req.userId!;

      const orden = await ordenServicioService.quitarItem(id as string, itemId as string, usuarioId);

      res.json({
        success: true,
        data: orden,
        mensaje: 'Ítem eliminado exitosamente',
      });
    } catch (error: any) {
      if (error.message.includes('no encontrada') || error.message.includes('no encontrado')) {
        return res.status(404).json({ success: false, error: error.message });
      }
      if (error.message.includes('No se puede quitar')) {
        return res.status(400).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // PATCH /api/ordenes-servicio/:id/estado
  async cambiarEstado(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { estado } = req.body;
      const usuarioId = req.userId!;

      const orden = await ordenServicioService.cambiarEstado(id as string, estado, usuarioId);

      res.json({
        success: true,
        data: orden,
        mensaje: `Estado actualizado a ${estado}`,
      });
    } catch (error: any) {
      if (error.message === 'Orden de servicio no encontrada') {
        return res.status(404).json({ success: false, error: error.message });
      }
      if (error.message.includes('Transición de estado inválida')) {
        return res.status(400).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // DELETE /api/ordenes-servicio/:id
  async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await ordenServicioService.eliminar(id as string);

      res.json({ success: true, mensaje: 'Orden de servicio eliminada exitosamente' });
    } catch (error: any) {
      if (error.message === 'Orden de servicio no encontrada') {
        return res.status(404).json({ success: false, error: error.message });
      }
      if (error.message.includes('Solo se pueden eliminar')) {
        return res.status(400).json({ success: false, error: error.message });
      }
      next(error);
    }
  }
}

export const ordenServicioController = new OrdenServicioController();
export default ordenServicioController;
