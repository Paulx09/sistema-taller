import { Request, Response, NextFunction } from 'express';
import tipoEquipoService from '../services/tipo-equipo.service';

export class TipoEquipoController {
  // GET /api/tipos-equipo
  async listarTodos(req: Request, res: Response, next: NextFunction) {
    try {
      const skip = req.query.skip ? Number(req.query.skip) : undefined;
      const take = req.query.take ? Number(req.query.take) : undefined;
      const busqueda = req.query.busqueda as string | undefined;
      const activo = req.query.activo !== undefined ? req.query.activo === 'true' : undefined;

      const { tiposEquipo, total } = await tipoEquipoService.listarTodos({ busqueda, activo, skip, take });
      res.json({
        success: true,
        data: tiposEquipo,
        total,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/tipos-equipo/:id
  async obtenerPorId(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const tipo = await tipoEquipoService.obtenerPorId(id);

      if (!tipo) {
        return res.status(404).json({
          success: false,
          error: 'Tipo de equipo no encontrado',
        });
      }

      res.json({
        success: true,
        data: tipo,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/tipos-equipo
  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const tipo = await tipoEquipoService.crear(req.body);
      res.status(201).json({
        success: true,
        data: tipo,
        mensaje: 'Tipo de equipo creado exitosamente',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Error al crear tipo de equipo',
      });
    }
  }

  // PUT /api/tipos-equipo/:id
  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const tipo = await tipoEquipoService.actualizar(id, req.body);
      res.json({
        success: true,
        data: tipo,
        mensaje: 'Tipo de equipo actualizado exitosamente',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Error al actualizar tipo de equipo',
      });
    }
  }

  // DELETE /api/tipos-equipo/:id
  async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await tipoEquipoService.eliminar(id);
      res.json({
        success: true,
        mensaje: 'Tipo de equipo eliminado exitosamente',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Error al eliminar tipo de equipo',
      });
    }
  }
}

export default new TipoEquipoController();
