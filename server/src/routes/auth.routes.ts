import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Login (público)
router.post('/login', authController.login);

// Verificar sesión actual (protegido)
router.get('/me', requireAuth, authController.getCurrentUser);

export default router;
