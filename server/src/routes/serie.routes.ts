import { Router } from 'express';
import serieController from '../controllers/serie.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Rutas de consulta (GET)
router.get('/verificar/:numeroSerie', requireAuth, serieController.verificarDisponibilidad);
router.get('/buscar/:numeroSerie', requireAuth, serieController.buscarPorNumeroSerie);
router.get('/garantia/:numeroSerie', requireAuth, serieController.verificarGarantia);
router.get('/producto/:productoId', requireAuth, serieController.obtenerSeriesPorProducto);
router.get('/producto/:productoId/disponibles', requireAuth, serieController.obtenerSeriesDisponibles);
router.get('/producto/:productoId/estadisticas', requireAuth, serieController.obtenerEstadisticas);

// Rutas de modificación (PATCH)
router.patch('/:numeroSerie/estado', requireAuth, serieController.cambiarEstado);

export default router;
