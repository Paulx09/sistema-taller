import { Router } from 'express';
import productoController from '../controllers/producto.controller';
import { productoValidator } from '../middlewares/validators/producto.validator';

const router = Router();

// Rutas especiales (deben ir ANTES de /:id para evitar conflictos)
router.get('/buscar', productoValidator.validarBusqueda, productoController.buscarParaCombobox);
router.get('/bajo-stock', productoController.obtenerBajoStock);
router.get('/sin-movimiento', productoController.obtenerSinMovimiento);

// Rutas CRUD principales
router.get('/', productoController.listar);
router.get('/:id', productoValidator.validarId, productoController.obtenerPorId);
router.post('/', productoValidator.crear, productoController.crear);
router.put('/:id', productoValidator.validarId, productoValidator.actualizar, productoController.actualizar);
router.patch('/:id/stock', productoValidator.validarId, productoValidator.ajustarStock, productoController.ajustarStock);
router.delete('/:id', productoValidator.validarId, productoController.eliminar);

export default router;
