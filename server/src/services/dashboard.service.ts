import prisma from '../config/database';

class DashboardService {
  // Obtener métricas generales del dashboard
  async obtenerMetricas() {
    const round2 = (value: number) => Number(value.toFixed(2));
    const calcularVariacionPct = (actual: number, anterior: number): number | null => {
      if (anterior === 0) {
        return actual === 0 ? 0 : null;
      }

      return round2(((actual - anterior) / anterior) * 100);
    };

    // Fecha de hoy (inicio y fin del día)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

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
        deletedAt: null,
      },
      select: {
        total: true,
        gananciaTotal: true,
      },
    });

    const ventasDelDiaAnterior = await prisma.venta.findMany({
      where: {
        fecha: {
          gte: ayer,
          lt: hoy,
        },
        estado: 'COMPLETADA',
        deletedAt: null,
      },
      select: {
        total: true,
        gananciaTotal: true,
      },
    });

    const ventasHoy = ventasDelDia.length;
    const ventasAyer = ventasDelDiaAnterior.length;
    const ingresosVentasHoy = ventasDelDia.reduce(
      (sum, venta) => sum + Number.parseFloat(venta.total.toString()),
      0
    );
    const gananciaVentas = ventasDelDia.reduce(
      (sum, venta) => sum + Number.parseFloat(venta.gananciaTotal.toString()),
      0
    );
    const gananciaVentasAyer = ventasDelDiaAnterior.reduce(
      (sum, venta) => sum + Number.parseFloat(venta.gananciaTotal.toString()),
      0
    );

    // Órdenes de servicio entregadas hoy y sus ganancias
    const osEntregadasHoy = await prisma.ordenServicio.findMany({
      where: {
        fechaEntrega: { gte: hoy, lt: manana },
        estado: 'ENTREGADA',
        deletedAt: null,
      },
      select: { total: true, gananciaTotal: true },
    });

    const osEntregadasAyer = await prisma.ordenServicio.findMany({
      where: {
        fechaEntrega: { gte: ayer, lt: hoy },
        estado: 'ENTREGADA',
        deletedAt: null,
      },
      select: { total: true, gananciaTotal: true },
    });

    const gananciaOS = osEntregadasHoy.reduce(
      (sum, os) => sum + Number.parseFloat(os.gananciaTotal.toString()),
      0
    );
    const gananciaOSAyer = osEntregadasAyer.reduce(
      (sum, os) => sum + Number.parseFloat(os.gananciaTotal.toString()),
      0
    );

    const ingresosOSHoy = osEntregadasHoy.reduce(
      (sum, os) => sum + Number.parseFloat(os.total.toString()),
      0
    );

    const gananciaHoy = round2(gananciaVentas + gananciaOS);
    const gananciaAyer = round2(gananciaVentasAyer + gananciaOSAyer);
    const ingresosHoy = ingresosVentasHoy + ingresosOSHoy;

    const variacionVentasPct = calcularVariacionPct(ventasHoy, ventasAyer);
    const variacionGananciaPct = calcularVariacionPct(gananciaHoy, gananciaAyer);
    const margenNetoHoyPct = ingresosHoy > 0 ? round2((gananciaHoy / ingresosHoy) * 100) : 0;

    // Contar órdenes activas por estado
    const [recibidas, enReparacion, listas] = await Promise.all([
      prisma.ordenServicio.count({ where: { estado: 'RECIBIDA', deletedAt: null } }),
      prisma.ordenServicio.count({ where: { estado: 'EN_REPARACION', deletedAt: null } }),
      prisma.ordenServicio.count({ where: { estado: 'LISTA', deletedAt: null } }),
    ]);

    return {
      ventasHoy,
      ventasAyer,
      gananciaHoy,
      gananciaAyer,
      variacionVentasPct,
      variacionGananciaPct,
      margenNetoHoyPct,
      productosStockBajo,
      productosSinMovimiento,
      ordenesActivas: recibidas + enReparacion + listas,
      ordenesDetalle: { recibidas, enReparacion, listas },
    };
  }
}

export default new DashboardService();
