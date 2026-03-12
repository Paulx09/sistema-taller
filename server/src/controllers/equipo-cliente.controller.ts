import { Request, Response, NextFunction } from 'express';
import equipoClienteService from '../services/equipo-cliente.service';

class EquipoClienteController {
  // GET /api/clientes/:clienteId/equipos
  async listarPorCliente(req: Request, res: Response, next: NextFunction) {
    try {
      const { clienteId } = req.params;
      const equipos = await equipoClienteService.listarPorCliente(clienteId as string);

      res.json({ success: true, data: equipos });
    } catch (error: any) {
      if (error.message === 'Cliente no encontrado') {
        return res.status(404).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // GET /api/equipos/:id
  async obtenerUno(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const equipo = await equipoClienteService.obtenerPorId(id as string, false);

      res.json({ success: true, data: equipo });
    } catch (error: any) {
      if (error.message === 'Equipo no encontrado') {
        return res.status(404).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // GET /api/equipos/:id/contrasena — revela la contraseña/patrón
  async revelarContrasena(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const equipo = await equipoClienteService.obtenerPorId(id as string, true);

      res.json({
        success: true,
        data: { contrasenaPatron: equipo.contrasenaPatron },
      });
    } catch (error: any) {
      if (error.message === 'Equipo no encontrado') {
        return res.status(404).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // POST /api/clientes/:clienteId/equipos
  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const { clienteId } = req.params;
      const { tipoEquipo, marca, modelo, numeroSerie, contrasenaPatron } = req.body;

      const equipo = await equipoClienteService.crear(clienteId as string, {
        tipoEquipo: tipoEquipo.trim(),
        marca: marca?.trim() || null,
        modelo: modelo?.trim() || null,
        numeroSerie: numeroSerie?.trim() || null,
        contrasenaPatron: contrasenaPatron?.trim() || null,
      });

      res.status(201).json({
        success: true,
        data: equipo,
        mensaje: 'Equipo registrado exitosamente',
      });
    } catch (error: any) {
      if (error.message === 'Cliente no encontrado') {
        return res.status(404).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // PUT /api/equipos/:id
  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { tipoEquipo, marca, modelo, numeroSerie, contrasenaPatron } = req.body;

      const equipo = await equipoClienteService.actualizar(id as string, {
        tipoEquipo: tipoEquipo?.trim(),
        marca: marca !== undefined ? (marca?.trim() || null) : undefined,
        modelo: modelo !== undefined ? (modelo?.trim() || null) : undefined,
        numeroSerie: numeroSerie !== undefined ? (numeroSerie?.trim() || null) : undefined,
        contrasenaPatron: contrasenaPatron !== undefined ? (contrasenaPatron?.trim() || null) : undefined,
      });

      res.json({
        success: true,
        data: equipo,
        mensaje: 'Equipo actualizado exitosamente',
      });
    } catch (error: any) {
      if (error.message === 'Equipo no encontrado') {
        return res.status(404).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  // DELETE /api/equipos/:id
  async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await equipoClienteService.eliminar(id as string);

      res.json({ success: true, mensaje: 'Equipo eliminado exitosamente' });
    } catch (error: any) {
      if (error.message === 'Equipo no encontrado') {
        return res.status(404).json({ success: false, error: error.message });
      }
      if (error.message.includes('No se puede eliminar')) {
        return res.status(400).json({ success: false, error: error.message });
      }
      next(error);
    }
  }
}

export const equipoClienteController = new EquipoClienteController();
export default equipoClienteController;
