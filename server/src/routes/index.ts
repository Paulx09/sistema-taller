import { Router } from 'express';
import ubicacionRoutes from './ubicacion.routes';
import categoriaRoutes from './categoria.routes';
import productoRoutes from './producto.routes';

const router = Router();

// Montar rutas
router.use('/ubicaciones', ubicacionRoutes);
router.use('/categorias', categoriaRoutes);
router.use('/productos', productoRoutes);

export default router;
