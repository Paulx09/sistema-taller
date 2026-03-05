import { Router } from 'express';
import { ordenServicioController } from '../controllers/orden-servicio.controller';
import { notaTecnicaController } from '../controllers/nota-tecnica.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { ordenServicioValidator } from '../middlewares/validators/orden-servicio.validator';

const router = Router();

router.use(requireAuth);

// Orden de servicio

// GET /api/ordenes-servicio
router.get('/', ordenServicioController.listar.bind(ordenServicioController));

// GET /api/ordenes-servicio/:id
router.get('/:id', ordenServicioValidator.validateId, ordenServicioController.obtenerUno.bind(ordenServicioController));

// POST /api/ordenes-servicio
router.post('/', ordenServicioValidator.crear, ordenServicioController.crear.bind(ordenServicioController));

// PUT /api/ordenes-servicio/:id   (solo usuarioTecnicoId + pagoACuenta)
router.put('/:id', ordenServicioValidator.validateId, ordenServicioValidator.actualizar, ordenServicioController.actualizar.bind(ordenServicioController));

// PATCH /api/ordenes-servicio/:id/estado   (solo ENTREGADA)
router.patch('/:id/estado', ordenServicioValidator.validateId, ordenServicioValidator.cambiarEstado, ordenServicioController.cambiarEstado.bind(ordenServicioController));

// DELETE /api/ordenes-servicio/:id
router.delete('/:id', ordenServicioValidator.validateId, ordenServicioController.eliminar.bind(ordenServicioController));

// Equipos de la orden

// POST /api/ordenes-servicio/:id/equipos
router.post('/:id/equipos', ordenServicioValidator.validateId, ordenServicioValidator.agregarEquipo, ordenServicioController.agregarEquipo.bind(ordenServicioController));

// PUT /api/ordenes-servicio/:id/equipos/:equipoOrdenId
router.put('/:id/equipos/:equipoOrdenId', ordenServicioValidator.validateId, ordenServicioValidator.actualizarEquipo, ordenServicioController.actualizarEquipo.bind(ordenServicioController));

// DELETE /api/ordenes-servicio/:id/equipos/:equipoOrdenId
router.delete('/:id/equipos/:equipoOrdenId', ordenServicioValidator.validateId, ordenServicioController.quitarEquipo.bind(ordenServicioController));

// PATCH /api/ordenes-servicio/:id/equipos/:equipoOrdenId/estado
router.patch('/:id/equipos/:equipoOrdenId/estado', ordenServicioValidator.validateId, ordenServicioValidator.cambiarEstadoEquipo, ordenServicioController.cambiarEstadoEquipo.bind(ordenServicioController));

// Items

// POST /api/ordenes-servicio/:id/equipos/:equipoOrdenId/items
router.post('/:id/equipos/:equipoOrdenId/items', ordenServicioValidator.validateId, ordenServicioValidator.agregarItem, ordenServicioController.agregarItem.bind(ordenServicioController));

// DELETE /api/ordenes-servicio/:id/items/:itemId
router.delete('/:id/items/:itemId', ordenServicioValidator.validateId, ordenServicioController.quitarItem.bind(ordenServicioController));

// Notas técnicas

// GET /api/ordenes-servicio/:ordenId/equipos/:equipoOrdenId/notas
router.get('/:ordenId/equipos/:equipoOrdenId/notas', notaTecnicaController.listar.bind(notaTecnicaController));

// POST /api/ordenes-servicio/:ordenId/equipos/:equipoOrdenId/notas
router.post('/:ordenId/equipos/:equipoOrdenId/notas', notaTecnicaController.agregar.bind(notaTecnicaController));

export default router;
