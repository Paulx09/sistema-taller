import { Router } from 'express';
import productoController from '../controllers/producto.controller';
import { productoValidator } from '../middlewares/validators/producto.validator';
import { upload, optimizeProductImage, parseFormData } from '../middlewares/upload.middleware';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Rutas especiales (deben ir ANTES de /:id para evitar conflictos)
router.get('/buscar', requireAuth, productoValidator.validarBusqueda, productoController.buscarParaCombobox);
router.get('/bajo-stock', requireAuth, productoController.obtenerBajoStock);
router.get('/sin-movimiento', requireAuth, productoController.obtenerSinMovimiento);
router.put('/:id/restaurar', requireAuth, productoValidator.validarId, productoController.restaurar);

// Rutas CRUD principales
router.get('/', requireAuth, productoController.listar);
router.get('/:id', requireAuth, productoValidator.validarId, productoController.obtenerPorId);
router.post(
  '/',
  requireAuth,
  upload.single('imagen'),
  optimizeProductImage,
  parseFormData,
  productoValidator.crear,
  productoController.crear
);
router.put(
  '/:id',
  requireAuth,
  productoValidator.validarId,
  upload.single('imagen'),
  optimizeProductImage,
  parseFormData,
  productoValidator.actualizar,
  productoController.actualizar
);
router.patch('/:id/stock', requireAuth, productoValidator.validarId, productoValidator.ajustarStock, productoController.ajustarStock);
router.delete('/:id', requireAuth, productoValidator.validarId, productoController.eliminar);

export default router;
