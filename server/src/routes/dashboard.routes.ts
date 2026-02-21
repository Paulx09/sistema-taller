import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/metricas', requireAuth, dashboardController.obtenerMetricas);

export default router;
