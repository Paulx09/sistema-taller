import { Router } from 'express';
import { clienteController } from '../controllers/cliente.controller';
import { equipoClienteController } from '../controllers/equipo-cliente.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { clienteValidator } from '../middlewares/validators/cliente.validator';
import { equipoClienteValidator } from '../middlewares/validators/equipo-cliente.validator';

const router = Router();

router.use(requireAuth);

// GET /api/clientes
router.get('/', clienteController.listar.bind(clienteController));

// GET /api/clientes/:id
router.get('/:id', clienteValidator.validateId, clienteController.obtenerUno.bind(clienteController));

// POST /api/clientes
router.post('/', clienteValidator.crear, clienteController.crear.bind(clienteController));

// PUT /api/clientes/:id
router.put('/:id', clienteValidator.validateId, clienteValidator.actualizar, clienteController.actualizar.bind(clienteController));

// DELETE /api/clientes/:id
router.delete('/:id', clienteValidator.validateId, clienteController.eliminar.bind(clienteController));

// ── Equipos anidados bajo cliente ─────────────────────────────────────────────
// GET /api/clientes/:clienteId/equipos
router.get('/:clienteId/equipos', equipoClienteController.listarPorCliente.bind(equipoClienteController));

// POST /api/clientes/:clienteId/equipos
router.post('/:clienteId/equipos', equipoClienteValidator.crear, equipoClienteController.crear.bind(equipoClienteController));

export default router;
