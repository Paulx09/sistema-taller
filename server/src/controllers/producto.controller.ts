import { Request, Response, NextFunction } from 'express';
import productoService from '../services/producto.service';

export class ProductoController {
  // GET /api/productos
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const { busqueda, categoriaId, esServicio, bajoStock, skip, take } = req.query;

      // Convertir esServicio string a boolean
      let esServicioBool: boolean | undefined;
      if (esServicio === 'true') esServicioBool = true;
      else if (esServicio === 'false') esServicioBool = false;

      const filtros = {
        busqueda: busqueda as string | undefined,
        categoriaId: categoriaId as string | undefined,
        esServicio: esServicioBool,
        bajoStock: bajoStock === 'true' ? true : undefined,
        skip: skip ? Number.parseInt(skip as string, 10) : undefined,
        take: take ? Number.parseInt(take as string, 10) : undefined,
      };

      const { productos, total } = await productoService.listar(filtros);

      res.json({
        success: true,
        data: productos,
        total,
        skip: filtros.skip ?? 0,
        take: filtros.take ?? 50,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/productos/buscar?q=...&excludeId=...
  async buscarParaCombobox(req: Request, res: Response, next: NextFunction) {
    try {
      const { q, excludeId } = req.query;

      if (!q) {
        return res.json({
          success: true,
          data: [],
        });
      }

      const productos = await productoService.buscarParaCombobox(
        q as string,
        excludeId as string | undefined
      );

      res.json({
        success: true,
        data: productos,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/productos/bajo-stock
  async obtenerBajoStock(req: Request, res: Response, next: NextFunction) {
    try {
      const productos = await productoService.obtenerBajoStock();

      res.json({
        success: true,
        data: productos,
        total: productos.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/productos/sin-movimiento?dias=90
  async obtenerSinMovimiento(req: Request, res: Response, next: NextFunction) {
    try {
      const { dias } = req.query;
      const diasNum = dias ? Number.parseInt(dias as string, 10) : 90;

      const productos = await productoService.obtenerSinMovimiento(diasNum);

      res.json({
        success: true,
        data: productos,
        total: productos.length,
        parametros: { dias: diasNum },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/productos/:id
  async obtenerPorId(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const producto = await productoService.obtenerPorId(id);

      if (!producto) {
        return res.status(404).json({
          success: false,
          error: 'Producto no encontrado',
        });
      }

      res.json({
        success: true,
        data: producto,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/productos
  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      // TODO: Obtener usuarioId del JWT cuando se implemente autenticación
      // Por ahora, usar el admin del seed
      const usuarioId = '78de9010-8b8b-4f6e-b3a7-40b4ff746404'; // UUID del admin del último seed

      const producto = await productoService.crear(req.body, usuarioId);

      res.status(201).json({
        success: true,
        data: producto,
        mensaje: 'Producto creado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/productos/:id
  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const producto = await productoService.actualizar(id, req.body);

      res.json({
        success: true,
        data: producto,
        mensaje: 'Producto actualizado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/productos/:id/stock
  async ajustarStock(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { cantidad, tipo, motivo } = req.body;

      // TODO: Obtener usuarioId del JWT cuando se implemente autenticación
      const usuarioId = '78de9010-8b8b-4f6e-b3a7-40b4ff746404';

      const producto = await productoService.ajustarStock(id, cantidad, tipo, motivo, usuarioId);

      res.json({
        success: true,
        data: producto,
        mensaje: 'Stock ajustado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/productos/:id
  async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await productoService.eliminar(id);

      res.json({
        success: true,
        mensaje: 'Producto eliminado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ProductoController();
