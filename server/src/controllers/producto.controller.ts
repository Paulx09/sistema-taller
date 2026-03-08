import { Request, Response, NextFunction } from 'express';
import productoService from '../services/producto.service';
import { deleteOldProductImage } from '../middlewares/upload.middleware';
import { serieService } from '../services/serie.service';

export class ProductoController {
  // GET /api/productos
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const { busqueda, categoriaId, esServicio, bajoStock, preciosPendientes, skip, take } = req.query;

      // Convertir esServicio string a boolean
      let esServicioBool: boolean | undefined;
      if (esServicio === 'true') esServicioBool = true;
      else if (esServicio === 'false') esServicioBool = false;

      const filtros = {
        busqueda: busqueda as string | undefined,
        categoriaId: categoriaId as string | undefined,
        esServicio: esServicioBool,
        bajoStock: bajoStock === 'true' ? true : undefined,
        preciosPendientes: preciosPendientes === 'true' ? true : undefined,
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

  // GET /api/productos/buscar?q=...&excludeId=...&incluirServicios=true
  async buscarParaCombobox(req: Request, res: Response, next: NextFunction) {
    try {
      const { q, excludeId, incluirServicios } = req.query;

      if (!q) {
        return res.json({
          success: true,
          data: [],
        });
      }

      const productos = await productoService.buscarParaCombobox(
        q as string,
        excludeId as string | undefined,
        incluirServicios === 'true'
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
      const usuarioId = req.userId as string;

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

  // POST /api/productos/rapido (Crear Producto Rápido desde Compras)
  async crearRapido(req: Request, res: Response, next: NextFunction) {
    try {
      const usuarioId = req.userId as string;
      
      // Determinar si los precios están pendientes
      const precioCompra = req.body.precioCompra ?? 0;
      const precioVenta = req.body.precioVenta ?? 0;
      const preciosPendientes = precioCompra === 0 || precioVenta === 0;
      
      const data = {
        ...req.body,
        precioCompra,
        precioVenta,
        preciosPendientes,
      };

      const producto = await productoService.crear(data, usuarioId);

      res.status(201).json({
        success: true,
        data: producto,
        mensaje: preciosPendientes 
          ? 'Producto creado. Recuerda definir los precios en Inventario.'
          : 'Producto creado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/productos/:id
  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      
      // Si hay nueva imagen, eliminar la anterior
      if (req.body.imagenUrl) {
        const productoActual = await productoService.obtenerPorId(id);
        if (productoActual?.imagenUrl) {
          deleteOldProductImage(productoActual.imagenUrl);
        }
      }
      
      // Extraer series retroactivas si existen
      const { seriesRetroactivas, ...datosProducto } = req.body;
      
      const producto = await productoService.actualizar(id, datosProducto);

      // Si hay series retroactivas, registrarlas
      if (seriesRetroactivas && Array.isArray(seriesRetroactivas) && seriesRetroactivas.length > 0) {
        try {
          await serieService.registrarSeriesRetroactivas(id, seriesRetroactivas);
        } catch (serieError: any) {
          // Si falla el registro de series, revertir el cambio de requiereSerie
          await productoService.actualizar(id, { requiereSerie: false });
          throw new Error(`Error al registrar series: ${serieError.message}`);
        }
      }

      res.json({
        success: true,
        data: producto,
        mensaje: seriesRetroactivas?.length > 0 
          ? `Producto actualizado y ${seriesRetroactivas.length} series registradas exitosamente`
          : 'Producto actualizado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/productos/:id/stock
  async ajustarStock(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { cantidad, tipo, motivo, numerosSerie } = req.body;

      // Obtener usuarioId del JWT (inyectado por requireAuth middleware)
      const usuarioId = req.userId as string;

      const producto = await productoService.ajustarStock(
        id,
        cantidad,
        tipo,
        motivo,
        usuarioId,
        numerosSerie
      );

      res.json({
        success: true,
        data: producto,
        mensaje: 'Stock ajustado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/productos/actualizar-precios-masivo
  async actualizarPreciosMasivo(req: Request, res: Response, next: NextFunction) {
    try {
      const actualizaciones = req.body as Array<{ id: string; precioVenta: number }>;

      if (!Array.isArray(actualizaciones) || actualizaciones.length === 0) {
        return res.status(400).json({
          error: 'Validación fallida',
          mensaje: 'Debe proporcionar un array de actualizaciones',
        });
      }

      // Actualizar cada producto
      const resultados = [];
      for (const { id, precioVenta } of actualizaciones) {
        try {
          const producto = await productoService.actualizar(id, { precioVenta });
          resultados.push({ id, success: true, precioVenta: producto.precioVenta });
        } catch (error: any) {
          resultados.push({ id, success: false, error: error.message });
        }
      }

      const exitosos = resultados.filter(r => r.success).length;
      const fallidos = resultados.filter(r => !r.success).length;

      res.json({
        success: true,
        mensaje: `Precios actualizados: ${exitosos} exitosos, ${fallidos} fallidos`,
        data: resultados,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/productos/:id
  async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const forzar = req.query.force === 'true';
      
      // Obtener producto para eliminar su imagen
      const producto = await productoService.obtenerPorId(id);
      
      // Eliminar producto (soft delete) con validaciones
      await productoService.eliminar(id, forzar);
      
      // Eliminar imagen físicamente
      if (producto?.imagenUrl) {
        deleteOldProductImage(producto.imagenUrl);
      }

      res.json({
        success: true,
        mensaje: 'Producto eliminado exitosamente',
      });
    } catch (error: any) {
      // Detectar si es advertencia que requiere confirmación
      if (error.message?.includes('|CONFIRMAR_REQUERIDO')) {
        const mensaje = error.message.split('|')[0];
        return res.status(409).json({
          error: 'Confirmación requerida',
          mensaje,
          requiereConfirmacion: true,
        });
      }
      next(error);
    }
  }

  // PUT /api/productos/:id/restaurar
  async restaurar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const producto = await productoService.restaurar(id);

      res.json({
        success: true,
        mensaje: 'Producto restaurado exitosamente',
        data: producto,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ProductoController();
