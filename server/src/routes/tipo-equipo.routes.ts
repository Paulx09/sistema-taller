import { Router } from 'express';
import tipoEquipoController from '../controllers/tipo-equipo.controller';
import { tipoEquipoValidator } from '../middlewares/validators/tipo-equipo.validator';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/tipos-equipo - Listar todos
router.get('/', requireAuth, tipoEquipoController.listarTodos.bind(tipoEquipoController));

// GET /api/tipos-equipo/:id - Obtener uno
router.get(
  '/:id',
  requireAuth,
  tipoEquipoValidator.validarId,
  tipoEquipoController.obtenerPorId.bind(tipoEquipoController)
);

// POST /api/tipos-equipo - Crear
router.post(
  '/',
  requireAuth,
  tipoEquipoValidator.crear,
  tipoEquipoController.crear.bind(tipoEquipoController)
);

// PUT /api/tipos-equipo/:id - Actualizar
router.put(
  '/:id',
  requireAuth,
  tipoEquipoValidator.validarId,
  tipoEquipoValidator.actualizar,
  tipoEquipoController.actualizar.bind(tipoEquipoController)
);

// DELETE /api/tipos-equipo/:id - Eliminar
router.delete(
  '/:id',
  requireAuth,
  tipoEquipoValidator.validarId,
  tipoEquipoController.eliminar.bind(tipoEquipoController)
);

export default router;
