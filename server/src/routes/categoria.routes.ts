import { Router } from 'express';
import categoriaController from '../controllers/categoria.controller';
import { categoriaValidator } from '../middlewares/validators/categoria.validator';

const router = Router();

// GET /api/categorias - Listar todas
router.get('/', categoriaController.listarTodas.bind(categoriaController));

// GET /api/categorias/:id - Obtener una
router.get(
  '/:id',
  categoriaValidator.validarId,
  categoriaController.obtenerPorId.bind(categoriaController)
);

// POST /api/categorias - Crear
router.post(
  '/',
  categoriaValidator.crear,
  categoriaController.crear.bind(categoriaController)
);

// PUT /api/categorias/:id - Actualizar
router.put(
  '/:id',
  categoriaValidator.validarId,
  categoriaValidator.actualizar,
  categoriaController.actualizar.bind(categoriaController)
);

// DELETE /api/categorias/:id - Eliminar
router.delete(
  '/:id',
  categoriaValidator.validarId,
  categoriaController.eliminar.bind(categoriaController)
);

export default router;
