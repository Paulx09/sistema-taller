import { Router } from 'express';
import { compraController } from '../controllers/compra.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

// GET /api/compras
router.get('/', compraController.listar.bind(compraController));

// GET /api/compras/:id
router.get('/:id', compraController.obtenerUna.bind(compraController));

// POST /api/compras (solo ADMIN puede crear)
router.post('/', compraController.crear.bind(compraController));

// DELETE /api/compras/:id (solo ADMIN puede anular)
router.delete('/:id', compraController.eliminar.bind(compraController));

export default router;
