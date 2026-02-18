import { Request, Response, NextFunction } from 'express';
import categoriaService from '../services/categoria.service';

export class CategoriaController {
  // GET /api/categorias
  async listarTodas(req: Request, res: Response, next: NextFunction) {
    try {
      const categorias = await categoriaService.listarTodas();
      res.json({
        success: true,
        data: categorias,
        total: categorias.length
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/categorias/:id
  async obtenerPorId(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number.parseInt(req.params.id as string, 10);
      const categoria = await categoriaService.obtenerPorId(id);

      if (!categoria) {
        return res.status(404).json({
          success: false,
          error: 'Categoría no encontrada'
        });
      }

      res.json({
        success: true,
        data: categoria
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/categorias
  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const categoria = await categoriaService.crear(req.body);
      res.status(201).json({
        success: true,
        data: categoria,
        mensaje: 'Categoría creada exitosamente'
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/categorias/:id
  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number.parseInt(req.params.id as string, 10);
      const categoria = await categoriaService.actualizar(id, req.body);
      res.json({
        success: true,
        data: categoria,
        mensaje: 'Categoría actualizada exitosamente'
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/categorias/:id
  async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number.parseInt(req.params.id as string, 10);
      await categoriaService.eliminar(id);
      res.json({
        success: true,
        mensaje: 'Categoría eliminada exitosamente'
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new CategoriaController();
