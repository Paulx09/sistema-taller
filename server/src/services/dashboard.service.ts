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

    // Ventas y ganancias de hoy
    const ventasDelDia = await prisma.venta.findMany({
      where: {
        fecha: {
          gte: hoy,
          lt: manana,
        },
        estado: 'COMPLETADA',
      },
      select: {
        total: true,
        gananciaTotal: true,
      },
    });

    const ventasHoy = ventasDelDia.length;
    const gananciaHoy = ventasDelDia.reduce(
      (sum, venta) => sum + Number.parseFloat(venta.gananciaTotal.toString()),
      0
    );

    // Contar órdenes activas por estado
    const [recibidas, enReparacion, listas] = await Promise.all([
      prisma.ordenServicio.count({ where: { estado: 'RECIBIDA', deletedAt: null } }),
      prisma.ordenServicio.count({ where: { estado: 'EN_REPARACION', deletedAt: null } }),
      prisma.ordenServicio.count({ where: { estado: 'LISTA', deletedAt: null } }),
    ]);

    return {
      ventasHoy,
      gananciaHoy,
      productosStockBajo,
      productosSinMovimiento,
      ordenesActivas: recibidas + enReparacion + listas,
      ordenesDetalle: { recibidas, enReparacion, listas },
    };
  }
}

export default new DashboardService();
