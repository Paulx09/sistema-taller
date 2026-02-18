import { Router } from 'express';
import ubicacionRoutes from './ubicacion.routes';
import categoriaRoutes from './categoria.routes';

const router = Router();

// Montar rutas
router.use('/ubicaciones', ubicacionRoutes);
router.use('/categorias', categoriaRoutes);

// TODO: Agregar más rutas aquí

export default router;
