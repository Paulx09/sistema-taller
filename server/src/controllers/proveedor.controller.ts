import { Request, Response, NextFunction } from 'express';
import proveedorService from '../services/proveedor.service';

class ProveedorController {
  // GET /api/proveedores
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const { busqueda, page, limit } = req.query;

      const skip = page ? (Number(page) - 1) * (Number(limit) || 50) : 0;
      const take = Number(limit) || 50;

      const filtros = {
        busqueda: busqueda as string,
        skip,
        take,
      };

      const { proveedores, total } = await proveedorService.listar(filtros);

      res.json({
        success: true,
        data: proveedores,
        total,
        page: Number(page) || 1,
        totalPages: Math.ceil(total / take),
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/proveedores/:id
  async obtenerUno(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const proveedor = await proveedorService.obtenerPorId(id as string);

      res.json({
        success: true,
        data: proveedor,
      });
    } catch (error: any) {
      if (error.message === 'Proveedor no encontrado') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }

  // POST /api/proveedores
  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const { nombreEmpresa, ruc, contactoNombre, telefono, email, direccion } = req.body;

      // Validaciones básicas
      if (!nombreEmpresa || nombreEmpresa.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'El nombre de la empresa es obligatorio',
        });
      }

      const proveedor = await proveedorService.crear({
        nombreEmpresa: nombreEmpresa.trim(),
        ruc: ruc?.trim(),
        contactoNombre: contactoNombre?.trim(),
        telefono: telefono?.trim(),
        email: email?.trim(),
        direccion: direccion?.trim(),
      });

      res.status(201).json({
        success: true,
        data: proveedor,
        mensaje: 'Proveedor creado exitosamente',
      });
    } catch (error: any) {
      if (error.message.includes('Ya existe un proveedor')) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }

  // PUT /api/proveedores/:id
  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { nombreEmpresa, ruc, contactoNombre, telefono, email, direccion } = req.body;

      const proveedor = await proveedorService.actualizar(id as string, {
        nombreEmpresa: nombreEmpresa?.trim(),
        ruc: ruc?.trim(),
        contactoNombre: contactoNombre?.trim(),
        telefono: telefono?.trim(),
        email: email?.trim(),
        direccion: direccion?.trim(),
      });

      res.json({
        success: true,
        data: proveedor,
        mensaje: 'Proveedor actualizado exitosamente',
      });
    } catch (error: any) {
      if (error.message === 'Proveedor no encontrado') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }
      if (error.message.includes('Ya existe otro proveedor')) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }

  // DELETE /api/proveedores/:id
  async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await proveedorService.eliminar(id as string);

      res.json({
        success: true,
        mensaje: 'Proveedor eliminado exitosamente',
      });
    } catch (error: any) {
      if (error.message === 'Proveedor no encontrado') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }
      if (error.message.includes('No se puede eliminar')) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
}

export const proveedorController = new ProveedorController();
