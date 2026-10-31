import { Request, Response, NextFunction } from 'express';
import marcaService from '../services/marca.service';

export class MarcaController {
  // GET /api/marcas
  async listarTodas(req: Request, res: Response, next: NextFunction) {
    try {
      const skip = req.query.skip ? Number(req.query.skip) : undefined;
      const take = req.query.take ? Number(req.query.take) : undefined;
      const busqueda = req.query.busqueda as string | undefined;

      const { marcas, total } = await marcaService.listarTodas({ busqueda, skip, take });
      res.json({
        success: true,
        data: marcas,
        total
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/marcas/:id
  async obtenerPorId(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const marca = await marcaService.obtenerPorId(id);

      if (!marca) {
        return res.status(404).json({
          success: false,
          error: 'Marca no encontrada'
        });
      }

      res.json({
        success: true,
        data: marca
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/marcas
  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const marca = await marcaService.crear(req.body);
      res.status(201).json({
        success: true,
        data: marca,
        mensaje: 'Marca creada exitosamente'
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/marcas/:id
  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const marca = await marcaService.actualizar(id, req.body);
      res.json({
        success: true,
        data: marca,
        mensaje: 'Marca actualizada exitosamente'
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/marcas/:id
  async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await marcaService.eliminar(id);
      res.json({
        success: true,
        mensaje: 'Marca eliminada exitosamente'
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new MarcaController();
