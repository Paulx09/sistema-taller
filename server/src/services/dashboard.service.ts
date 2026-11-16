import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { buildLocalWhereFilter } from './local.service';

export interface FiltrosDashboard {
  localId?: string;
  mes?: number;
  anio?: number;
}

interface RegistroEconomico {
  total: Prisma.Decimal | number | string;
  gananciaTotal: Prisma.Decimal | number | string;
}

interface RegistroConLocal extends RegistroEconomico {
  localId: string | null;
}

interface AgregadoOperaciones {
  cantidadVentas: number;
  ingresosVentas: number;
  gananciaVentas: number;
  cantidadOrdenesEntregadas: number;
  ingresosOrdenes: number;
  gananciaOrdenes: number;
  ingresosTotales: number;
  gananciaTotal: number;
  margenPct: number;
  ticketPromedio: number;
}

const round2 = (value: number): number => Number(value.toFixed(2));

const toNumber = (value: Prisma.Decimal | number | string): number =>
  Number.parseFloat(value.toString());

const calcularVariacionPct = (actual: number, anterior: number): number | null => {
  if (anterior === 0) {
    return actual === 0 ? 0 : null;
  }
  return round2(((actual - anterior) / anterior) * 100);
};

function sumarCampo(
  registros: RegistroEconomico[],
  campo: 'total' | 'gananciaTotal',
): number {
  return registros.reduce((sum, item) => sum + toNumber(item[campo]), 0);
}

function agregarOperaciones(
  ventas: RegistroEconomico[],
  ordenes: RegistroEconomico[],
): AgregadoOperaciones {
  const ingresosVentas = round2(sumarCampo(ventas, 'total'));
  const gananciaVentas = round2(sumarCampo(ventas, 'gananciaTotal'));
  const ingresosOrdenes = round2(sumarCampo(ordenes, 'total'));
  const gananciaOrdenes = round2(sumarCampo(ordenes, 'gananciaTotal'));
  const ingresosTotales = round2(ingresosVentas + ingresosOrdenes);
  const gananciaTotal = round2(gananciaVentas + gananciaOrdenes);
  const totalOperaciones = ventas.length + ordenes.length;

  return {
    cantidadVentas: ventas.length,
    ingresosVentas,
    gananciaVentas,
    cantidadOrdenesEntregadas: ordenes.length,
    ingresosOrdenes,
    gananciaOrdenes,
    ingresosTotales,
    gananciaTotal,
    margenPct: ingresosTotales > 0 ? round2((gananciaTotal / ingresosTotales) * 100) : 0,
    ticketPromedio: totalOperaciones > 0 ? round2(ingresosTotales / totalOperaciones) : 0,
  };
}

function filtrarPorLocal<T extends { localId: string | null }>(
  items: T[],
  localWhere: { localId?: string | null },
): T[] {
  if (!('localId' in localWhere)) {
    return items;
  }
  return items.filter((item) => item.localId === localWhere.localId);
}

function agruparPorLocal<T extends { localId: string | null }>(
  items: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = item.localId ?? 'WEB';
    const list = map.get(key);
    if (list) {
      list.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

class DashboardService {
  // Obtener métricas generales, mensuales y comparativa por local
  async obtenerMetricas(filtros: FiltrosDashboard = {}) {
    const ahora = new Date();
    const mes = filtros.mes ?? ahora.getMonth() + 1;
    const anio = filtros.anio ?? ahora.getFullYear();
    const localWhere = buildLocalWhereFilter(filtros.localId);

    // Rangos diarios (hoy y ayer)
    const hoy = new Date(ahora);
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    // Rangos mensuales (mes seleccionado y mes anterior)
    const inicioMes = new Date(anio, mes - 1, 1, 0, 0, 0, 0);
    const finMes = new Date(anio, mes, 1, 0, 0, 0, 0);
    const inicioMesAnterior = new Date(anio, mes - 2, 1, 0, 0, 0, 0);
    const finMesAnterior = inicioMes;

    // Fecha límite para productos sin movimiento (90 días)
    const fechaLimite = new Date(ahora);
    fechaLimite.setDate(fechaLimite.getDate() - 90);

    const [
      productosStockBajo,
      productosSinMovimiento,
      ventasDelDia,
      ventasDelDiaAnterior,
      osEntregadasHoy,
      osEntregadasAyer,
      recibidas,
      enReparacion,
      listas,
      localesActivos,
      ventasMesTodas,
      ordenesMesTodas,
      ventasMesAnterior,
      ordenesMesAnterior,
    ] = await Promise.all([
      prisma.producto.count({
        where: {
          deletedAt: null,
          esServicio: false,
          stockActual: { lte: prisma.producto.fields.stockMinimo },
        },
      }),
      prisma.producto.count({
        where: {
          deletedAt: null,
          detalleVentas: {
            none: {
              createdAt: { gte: fechaLimite },
            },
          },
        },
      }),
      prisma.venta.findMany({
        where: {
          fecha: { gte: hoy, lt: manana },
          estado: 'COMPLETADA',
          deletedAt: null,
          ...localWhere,
        },
        select: { total: true, gananciaTotal: true },
      }),
      prisma.venta.findMany({
        where: {
          fecha: { gte: ayer, lt: hoy },
          estado: 'COMPLETADA',
          deletedAt: null,
          ...localWhere,
        },
        select: { total: true, gananciaTotal: true },
      }),
      prisma.ordenServicio.findMany({
        where: {
          fechaEntrega: { gte: hoy, lt: manana },
          estado: 'ENTREGADA',
          deletedAt: null,
          ...localWhere,
        },
        select: { total: true, gananciaTotal: true },
      }),
      prisma.ordenServicio.findMany({
        where: {
          fechaEntrega: { gte: ayer, lt: hoy },
          estado: 'ENTREGADA',
          deletedAt: null,
          ...localWhere,
        },
        select: { total: true, gananciaTotal: true },
      }),
      prisma.ordenServicio.count({ where: { estado: 'RECIBIDA', deletedAt: null, ...localWhere } }),
      prisma.ordenServicio.count({ where: { estado: 'EN_REPARACION', deletedAt: null, ...localWhere } }),
      prisma.ordenServicio.count({ where: { estado: 'LISTA', deletedAt: null, ...localWhere } }),
      prisma.local.findMany({
        where: { activo: true },
        orderBy: { nombre: 'asc' },
        select: { id: true, codigo: true, nombre: true },
      }),
      prisma.venta.findMany({
        where: {
          fecha: { gte: inicioMes, lt: finMes },
          estado: 'COMPLETADA',
          deletedAt: null,
        },
        select: { localId: true, total: true, gananciaTotal: true },
      }),
      prisma.ordenServicio.findMany({
        where: {
          fechaEntrega: { gte: inicioMes, lt: finMes },
          estado: 'ENTREGADA',
          deletedAt: null,
        },
        select: { localId: true, total: true, gananciaTotal: true },
      }),
      prisma.venta.findMany({
        where: {
          fecha: { gte: inicioMesAnterior, lt: finMesAnterior },
          estado: 'COMPLETADA',
          deletedAt: null,
          ...localWhere,
        },
        select: { total: true, gananciaTotal: true },
      }),
      prisma.ordenServicio.findMany({
        where: {
          fechaEntrega: { gte: inicioMesAnterior, lt: finMesAnterior },
          estado: 'ENTREGADA',
          deletedAt: null,
          ...localWhere,
        },
        select: { total: true, gananciaTotal: true },
      }),
    ]);

    const hoyAgg = agregarOperaciones(ventasDelDia, osEntregadasHoy);
    const ayerAgg = agregarOperaciones(ventasDelDiaAnterior, osEntregadasAyer);

    const ventasMesFiltradas = filtrarPorLocal(ventasMesTodas as RegistroConLocal[], localWhere);
    const ordenesMesFiltradas = filtrarPorLocal(ordenesMesTodas as RegistroConLocal[], localWhere);
    const mesAgg = agregarOperaciones(ventasMesFiltradas, ordenesMesFiltradas);
    const mesAnteriorAgg = agregarOperaciones(ventasMesAnterior, ordenesMesAnterior);

    const ventasPorLocal = agruparPorLocal(ventasMesTodas as RegistroConLocal[]);
    const ordenesPorLocal = agruparPorLocal(ordenesMesTodas as RegistroConLocal[]);

    const bucketsLocales = [
      ...localesActivos.map((local) => ({
        localId: local.id,
        codigo: local.codigo,
        nombre: local.nombre,
      })),
      {
        localId: 'WEB',
        codigo: 'WEB',
        nombre: 'Tienda Web',
      },
    ];

    const rendimientoPorLocal = bucketsLocales.map((bucket) => {
      const agg = agregarOperaciones(
        ventasPorLocal.get(bucket.localId) ?? [],
        ordenesPorLocal.get(bucket.localId) ?? [],
      );
      return {
        localId: bucket.localId,
        codigo: bucket.codigo,
        nombre: bucket.nombre,
        ...agg,
      };
    });

    return {
      ventasHoy: hoyAgg.cantidadVentas,
      ventasAyer: ayerAgg.cantidadVentas,
      gananciaHoy: hoyAgg.gananciaTotal,
      gananciaAyer: ayerAgg.gananciaTotal,
      variacionVentasPct: calcularVariacionPct(hoyAgg.cantidadVentas, ayerAgg.cantidadVentas),
      variacionGananciaPct: calcularVariacionPct(hoyAgg.gananciaTotal, ayerAgg.gananciaTotal),
      margenNetoHoyPct: hoyAgg.margenPct,
      productosStockBajo,
      productosSinMovimiento,
      ordenesActivas: recibidas + enReparacion + listas,
      ordenesDetalle: { recibidas, enReparacion, listas },
      resumenMensual: {
        mes,
        anio,
        totalVentas: mesAgg.cantidadVentas,
        totalOrdenesEntregadas: mesAgg.cantidadOrdenesEntregadas,
        ingresosVentas: mesAgg.ingresosVentas,
        ingresosOrdenes: mesAgg.ingresosOrdenes,
        ingresosTotales: mesAgg.ingresosTotales,
        gananciaVentas: mesAgg.gananciaVentas,
        gananciaOrdenes: mesAgg.gananciaOrdenes,
        gananciaTotal: mesAgg.gananciaTotal,
        margenNetoPct: mesAgg.margenPct,
        ticketPromedio: mesAgg.ticketPromedio,
        variacionIngresosPct: calcularVariacionPct(
          mesAgg.ingresosTotales,
          mesAnteriorAgg.ingresosTotales,
        ),
        variacionGananciaPct: calcularVariacionPct(
          mesAgg.gananciaTotal,
          mesAnteriorAgg.gananciaTotal,
        ),
      },
      rendimientoPorLocal,
    };
  }
}

export default new DashboardService();
