import { Router } from 'express';
import ubicacionRoutes from './ubicacion.routes';

const router = Router();

// Montar rutas
router.use('/ubicaciones', ubicacionRoutes);

// TODO: Agregar más rutas aquí

export default router;
