import { Request, Response, NextFunction } from 'express';
import notaTecnicaService from '../services/nota-tecnica.service';

class NotaTecnicaController {
  // GET /api/ordenes-servicio/:ordenId/equipos/:equipoOrdenId/notas
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const { ordenId, equipoOrdenId } = req.params as Record<string, string>;
      const notas = await notaTecnicaService.listarPorEquipoOrden(ordenId, equipoOrdenId);
      res.json({ success: true, data: notas });
    } catch (error: any) {
      if (error.message === 'Equipo no encontrado en esta orden') {
        return res.status(404).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // POST /api/ordenes-servicio/:ordenId/equipos/:equipoOrdenId/notas
  async agregar(req: Request, res: Response, next: NextFunction) {
    try {
      const { ordenId, equipoOrdenId } = req.params as Record<string, string>;
      const { contenido } = req.body;
      const usuarioId = req.userId!;

      if (!contenido || contenido.trim() === '') {
        return res.status(400).json({ success: false, error: 'El contenido de la nota es requerido' });
      }

      const nota = await notaTecnicaService.agregar(ordenId, equipoOrdenId, usuarioId, contenido);

      res.status(201).json({
        success: true,
        data: nota,
        mensaje: 'Nota agregada exitosamente',
      });
    } catch (error: any) {
      if (error.message === 'Equipo no encontrado en esta orden') {
        return res.status(404).json({ success: false, error: error.message });
      }
      if (error.message.includes('No se pueden agregar notas')) {
        return res.status(400).json({ success: false, error: error.message });
      }
      next(error);
    }
  }
}

export const notaTecnicaController = new NotaTecnicaController();
export default notaTecnicaController;
