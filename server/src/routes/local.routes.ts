import { Router } from 'express';
import { localController } from '../controllers/local.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

// GET /api/locales
router.get('/', localController.listar.bind(localController));

export default router;
