import { Router } from 'express';
import { ordenServicioController } from '../controllers/orden-servicio.controller';
import { notaTecnicaController } from '../controllers/nota-tecnica.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { ordenServicioValidator } from '../middlewares/validators/orden-servicio.validator';

const router = Router();

router.use(requireAuth);

// GET /api/ordenes-servicio
router.get('/', ordenServicioController.listar.bind(ordenServicioController));

// GET /api/ordenes-servicio/:id
router.get('/:id', ordenServicioValidator.validateId, ordenServicioController.obtenerUno.bind(ordenServicioController));

// POST /api/ordenes-servicio
router.post('/', ordenServicioValidator.crear, ordenServicioController.crear.bind(ordenServicioController));

// PUT /api/ordenes-servicio/:id
router.put('/:id', ordenServicioValidator.validateId, ordenServicioValidator.actualizar, ordenServicioController.actualizar.bind(ordenServicioController));

// POST /api/ordenes-servicio/:id/items
router.post('/:id/items', ordenServicioValidator.validateId, ordenServicioValidator.agregarItem, ordenServicioController.agregarItem.bind(ordenServicioController));

// DELETE /api/ordenes-servicio/:id/items/:itemId
router.delete('/:id/items/:itemId', ordenServicioValidator.validateId, ordenServicioController.quitarItem.bind(ordenServicioController));

// PATCH /api/ordenes-servicio/:id/estado
router.patch('/:id/estado', ordenServicioValidator.validateId, ordenServicioValidator.cambiarEstado, ordenServicioController.cambiarEstado.bind(ordenServicioController));

// DELETE /api/ordenes-servicio/:id
router.delete('/:id', ordenServicioValidator.validateId, ordenServicioController.eliminar.bind(ordenServicioController));

// Notas Técnicas

// GET /api/ordenes-servicio/:ordenId/notas
router.get('/:ordenId/notas', notaTecnicaController.listar.bind(notaTecnicaController));

// POST /api/ordenes-servicio/:ordenId/notas
router.post('/:ordenId/notas', notaTecnicaController.agregar.bind(notaTecnicaController));

export default router;
