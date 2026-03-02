import { Request, Response, NextFunction } from 'express';
import clienteService from '../services/cliente.service';

class ClienteController {
  // GET /api/clientes
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const { busqueda, page, limit } = req.query;

      const take = Number(limit) || 50;
      const skip = page ? (Number(page) - 1) * take : 0;

      const { clientes, total } = await clienteService.listar({
        busqueda: busqueda as string,
        skip,
        take,
      });

      res.json({
        success: true,
        data: clientes,
        total,
        page: Number(page) || 1,
        totalPages: Math.ceil(total / take),
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/clientes/:id
  async obtenerUno(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const cliente = await clienteService.obtenerPorId(id as string);

      res.json({ success: true, data: cliente });
    } catch (error: any) {
      if (error.message === 'Cliente no encontrado') {
        return res.status(404).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // POST /api/clientes
  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const { nombre, dniRuc, telefono, direccion } = req.body;

      const cliente = await clienteService.crear({
        nombre: nombre.trim(),
        dniRuc: dniRuc?.trim() || null,
        telefono: telefono?.trim() || null,
        direccion: direccion?.trim() || null,
      });

      res.status(201).json({
        success: true,
        data: cliente,
        mensaje: 'Cliente creado exitosamente',
      });
    } catch (error: any) {
      if (error.message.includes('Ya existe un cliente')) {
        return res.status(400).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // PUT /api/clientes/:id
  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { nombre, dniRuc, telefono, direccion } = req.body;

      const cliente = await clienteService.actualizar(id as string, {
        nombre: nombre?.trim(),
        dniRuc: dniRuc !== undefined ? (dniRuc?.trim() || null) : undefined,
        telefono: telefono !== undefined ? (telefono?.trim() || null) : undefined,
        direccion: direccion !== undefined ? (direccion?.trim() || null) : undefined,
      });

      res.json({
        success: true,
        data: cliente,
        mensaje: 'Cliente actualizado exitosamente',
      });
    } catch (error: any) {
      if (error.message === 'Cliente no encontrado') {
        return res.status(404).json({ success: false, error: error.message });
      }
      if (error.message.includes('Ya existe un cliente')) {
        return res.status(400).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // DELETE /api/clientes/:id
  async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await clienteService.eliminar(id as string);

      res.json({
        success: true,
        mensaje: 'Cliente eliminado exitosamente',
      });
    } catch (error: any) {
      if (error.message === 'Cliente no encontrado') {
        return res.status(404).json({ success: false, error: error.message });
      }
      next(error);
    }
  }
}

export const clienteController = new ClienteController();
export default clienteController;
