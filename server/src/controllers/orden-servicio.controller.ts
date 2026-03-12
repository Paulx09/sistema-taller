import { Request, Response, NextFunction } from 'express';
import ordenServicioService from '../services/orden-servicio.service';
import { EstadoOrden, EstadoEquipoOrden } from '@prisma/client';

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
      const { id } = req.params as Record<string, string>;
      const orden = await ordenServicioService.obtenerPorId(id);
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
      const { clienteId, usuarioTecnicoId, pagoACuenta, equipos } = req.body;
      const usuarioRegistroId = req.userId!;

      const orden = await ordenServicioService.crear({
        clienteId,
        usuarioRegistroId,
        usuarioTecnicoId: usuarioTecnicoId ?? null,
        pagoACuenta: pagoACuenta ?? 0,
        equipos,
      });

      res.status(201).json({
        success: true,
        data: orden,
        mensaje: 'Orden de servicio creada exitosamente',
      });
    } catch (error: any) {
      const notFoundErrors = ['Cliente no encontrado', 'Equipo no encontrado', 'Técnico no encontrado', 'no pertenece al cliente'];
      if (notFoundErrors.some((msg) => error.message.includes(msg))) {
        return res.status(404).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // PUT /api/ordenes-servicio/:id
  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as Record<string, string>;
      const { usuarioTecnicoId, pagoACuenta } = req.body;

      const orden = await ordenServicioService.actualizar(id, { usuarioTecnicoId, pagoACuenta });

      res.json({
        success: true,
        data: orden,
        mensaje: 'Orden actualizada exitosamente',
      });
    } catch (error: any) {
      if (error.message === 'Orden de servicio no encontrada') {
        return res.status(404).json({ success: false, error: error.message });
      }
      if (error.message.includes('No se puede editar') || error.message.includes('no puede superar')) {
        return res.status(400).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // POST /api/ordenes-servicio/:id/equipos
  async agregarEquipo(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as Record<string, string>;
      const { equipoId, problemaReportado, diagnosticoTecnico, observacionesEsteticas, costoEstimado } = req.body;

      const orden = await ordenServicioService.agregarEquipo(id, {
        equipoId,
        problemaReportado,
        diagnosticoTecnico,
        observacionesEsteticas,
        costoEstimado,
      });

      res.status(201).json({
        success: true,
        data: orden,
        mensaje: 'Equipo agregado exitosamente',
      });
    } catch (error: any) {
      if (error.message.includes('no encontrada') || error.message.includes('no encontrado')) {
        return res.status(404).json({ success: false, error: error.message });
      }
      if (error.message.includes('No se puede agregar equipos')) {
        return res.status(400).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // PUT /api/ordenes-servicio/:id/equipos/:equipoOrdenId
  async actualizarEquipo(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, equipoOrdenId } = req.params as Record<string, string>;
      const { problemaReportado, diagnosticoTecnico, observacionesEsteticas, costoEstimado } = req.body;

      const orden = await ordenServicioService.actualizarEquipo(id, equipoOrdenId, {
        problemaReportado,
        diagnosticoTecnico,
        observacionesEsteticas,
        costoEstimado,
      });

      res.json({
        success: true,
        data: orden,
        mensaje: 'Equipo actualizado exitosamente',
      });
    } catch (error: any) {
      if (error.message.includes('no encontrado')) {
        return res.status(404).json({ success: false, error: error.message });
      }
      if (error.message.includes('No se puede editar')) {
        return res.status(400).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // DELETE /api/ordenes-servicio/:id/equipos/:equipoOrdenId
  async quitarEquipo(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, equipoOrdenId } = req.params as Record<string, string>;
      const usuarioId = req.userId!;

      const orden = await ordenServicioService.quitarEquipo(id, equipoOrdenId, usuarioId);

      res.json({
        success: true,
        data: orden,
        mensaje: 'Equipo quitado de la orden exitosamente',
      });
    } catch (error: any) {
      if (error.message.includes('no encontrada') || error.message.includes('no encontrado')) {
        return res.status(404).json({ success: false, error: error.message });
      }
      if (error.message.includes('debe tener al menos') || error.message.includes('No se puede quitar')) {
        return res.status(400).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // PATCH /api/ordenes-servicio/:id/equipos/:equipoOrdenId/estado
  async cambiarEstadoEquipo(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, equipoOrdenId } = req.params as Record<string, string>;
      const { estado } = req.body;
      const usuarioId = req.userId!;

      const orden = await ordenServicioService.cambiarEstadoEquipo(
        id,
        equipoOrdenId,
        estado as EstadoEquipoOrden,
        usuarioId,
      );

      res.json({
        success: true,
        data: orden,
        mensaje: `Estado del equipo actualizado a ${estado}`,
      });
    } catch (error: any) {
      if (error.message.includes('no encontrada') || error.message.includes('no encontrado')) {
        return res.status(404).json({ success: false, error: error.message });
      }
      if (error.message.includes('No se puede modificar')) {
        return res.status(400).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // POST /api/ordenes-servicio/:id/equipos/:equipoOrdenId/items
  async agregarItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, equipoOrdenId } = req.params as Record<string, string>;
      const { productoId, cantidad, precioUnitario } = req.body;
      const usuarioId = req.userId!;

      const orden = await ordenServicioService.agregarItem(
        id,
        equipoOrdenId,
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
      const { id, itemId } = req.params as Record<string, string>;
      const usuarioId = req.userId!;

      const orden = await ordenServicioService.quitarItem(id, itemId, usuarioId);

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

  // PATCH /api/ordenes-servicio/:id/items/:itemId  (actualizar cantidad)
  async actualizarItemCantidad(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, itemId } = req.params as Record<string, string>;
      const { cantidad } = req.body;
      const usuarioId = req.userId!;

      const orden = await ordenServicioService.actualizarItemCantidad(id, itemId, cantidad, usuarioId);

      res.json({
        success: true,
        data: orden,
        mensaje: 'Cantidad actualizada exitosamente',
      });
    } catch (error: any) {
      if (error.message.includes('no encontrada') || error.message.includes('no encontrado')) {
        return res.status(404).json({ success: false, error: error.message });
      }
      if (error.message.includes('Stock insuficiente') || error.message.includes('No se puede modificar')) {
        return res.status(400).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // PATCH /api/ordenes-servicio/:id/estado  (solo ENTREGADA)
  async cambiarEstado(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as Record<string, string>;
      const { estado } = req.body;
      const usuarioId = req.userId!;

      const orden = await ordenServicioService.cambiarEstado(id, estado as EstadoOrden, usuarioId);

      res.json({
        success: true,
        data: orden,
        mensaje: `Estado actualizado a ${estado}`,
      });
    } catch (error: any) {
      if (error.message === 'Orden de servicio no encontrada') {
        return res.status(404).json({ success: false, error: error.message });
      }
      if (error.message.includes('Transición inválida') || error.message.includes('saldo pendiente') || error.message.includes('Solo se puede')) {
        return res.status(400).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // DELETE /api/ordenes-servicio/:id
  async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as Record<string, string>;
      await ordenServicioService.eliminar(id);
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
