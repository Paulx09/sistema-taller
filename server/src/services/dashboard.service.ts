import prisma from '../config/database';

class DashboardService {
  // Obtener métricas generales del dashboard
  async obtenerMetricas() {
    // Fecha de hoy (inicio y fin del día)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    // Contar productos con stock bajo
    const productosStockBajo = await prisma.producto.count({
      where: {
        deletedAt: null,
        esServicio: false,
        stockActual: { lte: prisma.producto.fields.stockMinimo },
      },
    });

    // Contar productos sin movimiento (90 días por defecto)
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 90);

    const productosSinMovimiento = await prisma.producto.count({
      where: {
        deletedAt: null,
        detalleVentas: {
          none: {
            createdAt: { gte: fechaLimite },
          },
        },
      },
    });

    // Ventas y ganancias: Se implementarán con el módulo de Ventas
    const ventasHoy = 0;
    const gananciaHoy = 0;

    return {
      ventasHoy,
      gananciaHoy,
      productosStockBajo,
      productosSinMovimiento,
    };
  }
}

export default new DashboardService();
