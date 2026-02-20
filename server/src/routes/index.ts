import { Router } from 'express';
import ubicacionRoutes from './ubicacion.routes';
import categoriaRoutes from './categoria.routes';
import productoRoutes from './producto.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

// Montar rutas
router.use('/ubicaciones', ubicacionRoutes);
router.use('/categorias', categoriaRoutes);
router.use('/productos', productoRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
