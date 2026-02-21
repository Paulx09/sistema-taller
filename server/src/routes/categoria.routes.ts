import { Router } from 'express';
import categoriaController from '../controllers/categoria.controller';
import { categoriaValidator } from '../middlewares/validators/categoria.validator';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/categorias - Listar todas
router.get('/', requireAuth, categoriaController.listarTodas.bind(categoriaController));

// GET /api/categorias/:id - Obtener una
router.get(
  '/:id',
  requireAuth,
  categoriaValidator.validarId,
  categoriaController.obtenerPorId.bind(categoriaController)
);

// POST /api/categorias - Crear
router.post(
  '/',
  requireAuth,
  categoriaValidator.crear,
  categoriaController.crear.bind(categoriaController)
);

// PUT /api/categorias/:id - Actualizar
router.put(
  '/:id',
  requireAuth,
  categoriaValidator.validarId,
  categoriaValidator.actualizar,
  categoriaController.actualizar.bind(categoriaController)
);

// DELETE /api/categorias/:id - Eliminar
router.delete(
  '/:id',
  requireAuth,
  categoriaValidator.validarId,
  categoriaController.eliminar.bind(categoriaController)
);

export default router;
