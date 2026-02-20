import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';

const router = Router();

router.get('/metricas', dashboardController.obtenerMetricas);

export default router;
