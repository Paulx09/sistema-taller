import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Login (público)
router.post('/login', authController.login);

// Verificar sesión actual (protegido)
router.get('/me', requireAuth, authController.getCurrentUser);

// Listar todos los usuarios (protegido)
router.get('/usuarios', requireAuth, authController.listarUsuarios);

export default router;
