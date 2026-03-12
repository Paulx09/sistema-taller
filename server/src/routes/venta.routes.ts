import { Router } from 'express';
import { ventaController } from '../controllers/venta.controller';
import { ventaValidator } from '../middlewares/validators/venta.validator';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas de ventas requieren autenticación
router.use(requireAuth);

// GET /api/ventas/hoy — ANTES de /:id para no ser capturado por el param
router.get('/hoy', ventaController.listarHoy.bind(ventaController));

// GET /api/ventas
router.get('/', ventaController.listar.bind(ventaController));

// GET /api/ventas/:id
router.get('/:id', ventaController.obtenerUna.bind(ventaController));

// POST /api/ventas
router.post('/', ventaValidator.crear, ventaController.crear.bind(ventaController));

export default router;
