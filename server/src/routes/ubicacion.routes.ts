import { Router } from 'express';
import ubicacionController from '../controllers/ubicacion.controller';
import { ubicacionValidator } from '../middlewares/validators/ubicacion.validator';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/ubicaciones - Listar todas
router.get('/', requireAuth, ubicacionController.listarTodas.bind(ubicacionController));

// GET /api/ubicaciones/:id - Obtener una
router.get(
  '/:id',
  requireAuth,
  ubicacionValidator.validarId,
  ubicacionController.obtenerPorId.bind(ubicacionController)
);

// POST /api/ubicaciones - Crear
router.post(
  '/',
  requireAuth,
  ubicacionValidator.crear,
  ubicacionController.crear.bind(ubicacionController)
);

// PUT /api/ubicaciones/:id - Actualizar
router.put(
  '/:id',
  requireAuth,
  ubicacionValidator.validarId,
  ubicacionValidator.actualizar,
  ubicacionController.actualizar.bind(ubicacionController)
);

// DELETE /api/ubicaciones/:id - Eliminar
router.delete(
  '/:id',
  requireAuth,
  ubicacionValidator.validarId,
  ubicacionController.eliminar.bind(ubicacionController)
);

export default router;
