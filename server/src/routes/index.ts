import { Router } from 'express';
import ubicacionRoutes from './ubicacion.routes';
import categoriaRoutes from './categoria.routes';
import productoRoutes from './producto.routes';
import dashboardRoutes from './dashboard.routes';
import authRoutes from './auth.routes';
import ventaRoutes from './venta.routes';
import proveedorRoutes from './proveedor.routes';
import compraRoutes from './compra.routes';
import serieRoutes from './serie.routes';

const router = Router();

// Montar rutas
router.use('/auth', authRoutes);
router.use('/ubicaciones', ubicacionRoutes);
router.use('/categorias', categoriaRoutes);
router.use('/productos', productoRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/ventas', ventaRoutes);
router.use('/proveedores', proveedorRoutes);
router.use('/compras', compraRoutes);
router.use('/series', serieRoutes);

export default router;
