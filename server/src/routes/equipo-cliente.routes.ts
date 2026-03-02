import { Router } from 'express';
import { equipoClienteController } from '../controllers/equipo-cliente.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { equipoClienteValidator } from '../middlewares/validators/equipo-cliente.validator';

const router = Router();

router.use(requireAuth);

// GET /api/equipos/:id
router.get('/:id', equipoClienteValidator.validateId, equipoClienteController.obtenerUno.bind(equipoClienteController));

// GET /api/equipos/:id/contrasena — revelar contraseña/patrón (solo ADMIN)
router.get('/:id/contrasena', equipoClienteValidator.validateId, equipoClienteController.revelarContrasena.bind(equipoClienteController));

// PUT /api/equipos/:id
router.put('/:id', equipoClienteValidator.validateId, equipoClienteValidator.actualizar, equipoClienteController.actualizar.bind(equipoClienteController));

// DELETE /api/equipos/:id
router.delete('/:id', equipoClienteValidator.validateId, equipoClienteController.eliminar.bind(equipoClienteController));

export default router;
