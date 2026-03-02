import { Request, Response, NextFunction } from 'express';
import notaTecnicaService from '../services/nota-tecnica.service';

class NotaTecnicaController {
  // GET /api/ordenes-servicio/:ordenId/notas
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const { ordenId } = req.params;
      const notas = await notaTecnicaService.listarPorOrden(ordenId as string);
      res.json({ success: true, data: notas });
    } catch (error: any) {
      if (error.message === 'Orden de servicio no encontrada') {
        return res.status(404).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // POST /api/ordenes-servicio/:ordenId/notas
  async agregar(req: Request, res: Response, next: NextFunction) {
    try {
      const { ordenId } = req.params;
      const { contenido } = req.body;
      const usuarioId = req.userId!;

      if (!contenido || contenido.trim() === '') {
        return res.status(400).json({ success: false, error: 'El contenido de la nota es requerido' });
      }

      const nota = await notaTecnicaService.agregar(ordenId as string, usuarioId, contenido);

      res.status(201).json({
        success: true,
        data: nota,
        mensaje: 'Nota agregada exitosamente',
      });
    } catch (error: any) {
      if (error.message === 'Orden de servicio no encontrada') {
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
