import { Router } from 'express';
import ubicacionController from '../controllers/ubicacion.controller';
import { ubicacionValidator } from '../middlewares/validators/ubicacion.validator';

const router = Router();

// GET /api/ubicaciones - Listar todas
router.get('/', ubicacionController.listarTodas.bind(ubicacionController));

// GET /api/ubicaciones/:id - Obtener una
router.get(
  '/:id',
  ubicacionValidator.validarId,
  ubicacionController.obtenerPorId.bind(ubicacionController)
);

// POST /api/ubicaciones - Crear
router.post(
  '/',
  ubicacionValidator.crear,
  ubicacionController.crear.bind(ubicacionController)
);

// PUT /api/ubicaciones/:id - Actualizar
router.put(
  '/:id',
  ubicacionValidator.validarId,
  ubicacionValidator.actualizar,
  ubicacionController.actualizar.bind(ubicacionController)
);

// DELETE /api/ubicaciones/:id - Eliminar
router.delete(
  '/:id',
  ubicacionValidator.validarId,
  ubicacionController.eliminar.bind(ubicacionController)
);

export default router;
