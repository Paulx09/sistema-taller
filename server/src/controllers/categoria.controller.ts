import { Request, Response, NextFunction } from 'express';
import { TipoItem } from '@prisma/client';
import categoriaService from '../services/categoria.service';

export class CategoriaController {
  // GET /api/categorias
  async listarTodas(req: Request, res: Response, next: NextFunction) {
    try {
      const skip = req.query.skip ? Number(req.query.skip) : undefined;
      const rawLimit = req.query.take || req.query.limit;
      const take = rawLimit && rawLimit !== 'all' ? Number(rawLimit) : undefined;
      const tipo = req.query.tipo as TipoItem | undefined;
      const todas = req.query.todas === 'true' || req.query.all === 'true' || rawLimit === 'all';

      const { categorias, total } = await categoriaService.listarTodas({ tipo, skip, take, todas });
      res.json({
        success: true,
        data: categorias,
        total,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/categorias/:id
  async obtenerPorId(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const categoria = await categoriaService.obtenerPorId(id);

      if (!categoria) {
        return res.status(404).json({
          success: false,
          error: 'Categoría no encontrada',
        });
      }

      res.json({
        success: true,
        data: categoria,
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
        mensaje: 'Categoría creada exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/categorias/:id
  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const categoria = await categoriaService.actualizar(id, req.body);
      res.json({
        success: true,
        data: categoria,
        mensaje: 'Categoría actualizada exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/categorias/:id
  async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await categoriaService.eliminar(id);
      res.json({
        success: true,
        mensaje: 'Categoría eliminada exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new CategoriaController();
