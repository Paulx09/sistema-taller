import { Router } from 'express';
import marcaController from '../controllers/marca.controller';
import { marcaValidator } from '../middlewares/validators/marca.validator';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/marcas - Listar todas
router.get('/', requireAuth, marcaController.listarTodas.bind(marcaController));

// GET /api/marcas/:id - Obtener una
router.get(
  '/:id',
  requireAuth,
  marcaValidator.validarId,
  marcaController.obtenerPorId.bind(marcaController)
);

// POST /api/marcas - Crear
router.post(
  '/',
  requireAuth,
  marcaValidator.crear,
  marcaController.crear.bind(marcaController)
);

// PUT /api/marcas/:id - Actualizar
router.put(
  '/:id',
  requireAuth,
  marcaValidator.validarId,
  marcaValidator.actualizar,
  marcaController.actualizar.bind(marcaController)
);

// DELETE /api/marcas/:id - Eliminar
router.delete(
  '/:id',
  requireAuth,
  marcaValidator.validarId,
  marcaController.eliminar.bind(marcaController)
);

export default router;
