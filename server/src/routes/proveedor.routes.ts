import { Router } from 'express';
import { proveedorController } from '../controllers/proveedor.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

// GET /api/proveedores
router.get('/', proveedorController.listar.bind(proveedorController));

// GET /api/proveedores/:id
router.get('/:id', proveedorController.obtenerUno.bind(proveedorController));

// POST /api/proveedores (solo ADMIN)
router.post('/', proveedorController.crear.bind(proveedorController));

// PUT /api/proveedores/:id (solo ADMIN)
router.put('/:id', proveedorController.actualizar.bind(proveedorController));

// DELETE /api/proveedores/:id (solo ADMIN)
router.delete('/:id', proveedorController.eliminar.bind(proveedorController));

export default router;
