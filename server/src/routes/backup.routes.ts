import { Router } from 'express';
import { backupController } from '../controllers/backup.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Solo usuarios autenticados pueden disparar o consultar backups
router.post('/ejecutar', requireAuth, backupController.ejecutar);
router.get('/estado', requireAuth, backupController.estado);

export default router;
