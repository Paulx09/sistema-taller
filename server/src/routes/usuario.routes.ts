import { Router } from 'express';
import { usuarioController } from '../controllers/usuario.controller';
import { requireAuth, requireAdmin } from '../middlewares/auth.middleware';
import { usuarioValidator } from '../middlewares/validators/usuario.validator';

const router = Router();

// Todas las rutas de gestión de usuarios requieren autenticación y rol ADMIN
router.use(requireAuth, requireAdmin);

// GET /api/usuarios
router.get('/', usuarioController.listar.bind(usuarioController));

// POST /api/usuarios
router.post(
  '/',
  usuarioValidator.crear,
  usuarioController.crear.bind(usuarioController)
);

// PATCH /api/usuarios/:id
router.patch(
  '/:id',
  usuarioValidator.validateId,
  usuarioValidator.actualizar,
  usuarioController.actualizar.bind(usuarioController)
);

// PATCH /api/usuarios/:id/password
router.patch(
  '/:id/password',
  usuarioValidator.validateId,
  usuarioValidator.cambiarPassword,
  usuarioController.cambiarPassword.bind(usuarioController)
);

export default router;
