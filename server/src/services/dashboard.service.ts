import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { buildLocalWhereFilter } from './local.service';

export interface FiltrosDashboard {
  localId?: string;
  mes?: number;
  anio?: number;
}

interface ConteosDashboardRow {
  productosStockBajo: number;
  productosSinMovimiento: number;
  recibidas: number;
  enReparacion: number;
  listas: number;
}

interface AgregadoLocalRawRow {
  localKey: string;
  hoy_cnt: number;
  hoy_total: number;
  hoy_gan: number;
  ayer_cnt: number;
  ayer_total: number;
  ayer_gan: number;
  mes_cnt: number;
  mes_total: number;
  mes_gan: number;
  mes_ant_cnt: number;
  mes_ant_total: number;
  mes_ant_gan: number;
}

type PeriodoKey = 'hoy' | 'ayer' | 'mes' | 'mes_ant';

interface AcumuladoPeriodo {
  cantidad: number;
  total: number;
  ganancia: number;
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

const calcularVariacionPct = (actual: number, anterior: number): number | null => {
  if (anterior === 0) {
    return actual === 0 ? 0 : null;
  }
  return round2(((actual - anterior) / anterior) * 100);
};

function coincideLocal(
  localKey: string,
  localWhere: { localId?: string | null },
): boolean {
  if (!('localId' in localWhere)) {
    return true;
  }
  if (localWhere.localId === null) {
    return localKey === 'WEB';
  }
  return localKey === localWhere.localId;
}

function sumarPeriodo(
  rows: AgregadoLocalRawRow[],
  localWhere: { localId?: string | null },
  periodo: PeriodoKey,
): AcumuladoPeriodo {
  const cntField = `${periodo}_cnt` as const;
  const totalField = `${periodo}_total` as const;
  const ganField = `${periodo}_gan` as const;

  let cantidad = 0;
  let total = 0;
  let ganancia = 0;

  for (const row of rows) {
    if (!coincideLocal(row.localKey, localWhere)) {
      continue;
    }
    cantidad += Number(row[cntField] ?? 0);
    total += Number(row[totalField] ?? 0);
    ganancia += Number(row[ganField] ?? 0);
  }

  return { cantidad, total, ganancia };
}

function extraerPeriodoRow(
  row: AgregadoLocalRawRow | undefined,
  periodo: PeriodoKey,
): AcumuladoPeriodo {
  if (!row) {
    return { cantidad: 0, total: 0, ganancia: 0 };
  }
  return {
    cantidad: Number(row[`${periodo}_cnt`] ?? 0),
    total: Number(row[`${periodo}_total`] ?? 0),
    ganancia: Number(row[`${periodo}_gan`] ?? 0),
  };
}

function construirAgregado(
  ventas: AcumuladoPeriodo,
  ordenes: AcumuladoPeriodo,
): AgregadoOperaciones {
  const ingresosVentas = round2(ventas.total);
  const gananciaVentas = round2(ventas.ganancia);
  const ingresosOrdenes = round2(ordenes.total);
  const gananciaOrdenes = round2(ordenes.ganancia);
  const ingresosTotales = round2(ingresosVentas + ingresosOrdenes);
  const gananciaTotal = round2(gananciaVentas + gananciaOrdenes);
  const totalOperaciones = ventas.cantidad + ordenes.cantidad;

  return {
    cantidadVentas: ventas.cantidad,
    ingresosVentas,
    gananciaVentas,
    cantidadOrdenesEntregadas: ordenes.cantidad,
    ingresosOrdenes,
    gananciaOrdenes,
    ingresosTotales,
    gananciaTotal,
    margenPct: ingresosTotales > 0 ? round2((gananciaTotal / ingresosTotales) * 100) : 0,
    ticketPromedio: totalOperaciones > 0 ? round2(ingresosTotales / totalOperaciones) : 0,
  };
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

    const ordenLocalFilter = !('localId' in localWhere)
      ? Prisma.empty
      : localWhere.localId === null
        ? Prisma.sql`AND local_id IS NULL`
        : Prisma.sql`AND local_id = ${localWhere.localId}`;

    const [localesActivos, conteosRows, ventasAggRows, ordenesAggRows] = await Promise.all([
      prisma.local.findMany({
        where: { activo: true },
        orderBy: { nombre: 'asc' },
        select: { id: true, codigo: true, nombre: true },
      }),
      prisma.$queryRaw<ConteosDashboardRow[]>(Prisma.sql`
        WITH os_counts AS (
          SELECT
            COUNT(*) FILTER (WHERE estado = 'RECIBIDA'::"EstadoOrden")::int AS recibidas,
            COUNT(*) FILTER (WHERE estado = 'EN_REPARACION'::"EstadoOrden")::int AS en_reparacion,
            COUNT(*) FILTER (WHERE estado = 'LISTA'::"EstadoOrden")::int AS listas
          FROM public.ordenes_servicio
          WHERE deleted_at IS NULL
            AND estado IN ('RECIBIDA'::"EstadoOrden", 'EN_REPARACION'::"EstadoOrden", 'LISTA'::"EstadoOrden")
            ${ordenLocalFilter}
        )
        SELECT
          (
            SELECT COUNT(*)::int
            FROM public.productos p
            WHERE p.deleted_at IS NULL
              AND p.es_servicio = false
              AND p.stock_actual <= p.stock_minimo
          ) AS "productosStockBajo",
          (
            SELECT COUNT(*)::int
            FROM public.productos p
            WHERE p.deleted_at IS NULL
              AND NOT EXISTS (
                SELECT 1
                FROM public.detalle_ventas dv
                WHERE dv.producto_id = p.id
                  AND dv.created_at >= ${fechaLimite}
              )
          ) AS "productosSinMovimiento",
          os_counts.recibidas AS "recibidas",
          os_counts.en_reparacion AS "enReparacion",
          os_counts.listas AS "listas"
        FROM os_counts
      `),
      prisma.$queryRaw<AgregadoLocalRawRow[]>(Prisma.sql`
        SELECT
          COALESCE(local_id, 'WEB') AS "localKey",
          COUNT(*) FILTER (WHERE fecha >= ${hoy} AND fecha < ${manana})::int AS "hoy_cnt",
          COALESCE(SUM(total) FILTER (WHERE fecha >= ${hoy} AND fecha < ${manana}), 0)::float8 AS "hoy_total",
          COALESCE(SUM(ganancia_total) FILTER (WHERE fecha >= ${hoy} AND fecha < ${manana}), 0)::float8 AS "hoy_gan",
          COUNT(*) FILTER (WHERE fecha >= ${ayer} AND fecha < ${hoy})::int AS "ayer_cnt",
          COALESCE(SUM(total) FILTER (WHERE fecha >= ${ayer} AND fecha < ${hoy}), 0)::float8 AS "ayer_total",
          COALESCE(SUM(ganancia_total) FILTER (WHERE fecha >= ${ayer} AND fecha < ${hoy}), 0)::float8 AS "ayer_gan",
          COUNT(*) FILTER (WHERE fecha >= ${inicioMes} AND fecha < ${finMes})::int AS "mes_cnt",
          COALESCE(SUM(total) FILTER (WHERE fecha >= ${inicioMes} AND fecha < ${finMes}), 0)::float8 AS "mes_total",
          COALESCE(SUM(ganancia_total) FILTER (WHERE fecha >= ${inicioMes} AND fecha < ${finMes}), 0)::float8 AS "mes_gan",
          COUNT(*) FILTER (WHERE fecha >= ${inicioMesAnterior} AND fecha < ${finMesAnterior})::int AS "mes_ant_cnt",
          COALESCE(SUM(total) FILTER (WHERE fecha >= ${inicioMesAnterior} AND fecha < ${finMesAnterior}), 0)::float8 AS "mes_ant_total",
          COALESCE(SUM(ganancia_total) FILTER (WHERE fecha >= ${inicioMesAnterior} AND fecha < ${finMesAnterior}), 0)::float8 AS "mes_ant_gan"
        FROM public.ventas
        WHERE deleted_at IS NULL
          AND estado = 'COMPLETADA'
          AND (
            (fecha >= ${ayer} AND fecha < ${manana})
            OR (fecha >= ${inicioMesAnterior} AND fecha < ${finMes})
          )
        GROUP BY COALESCE(local_id, 'WEB')
      `),
      prisma.$queryRaw<AgregadoLocalRawRow[]>(Prisma.sql`
        SELECT
          COALESCE(local_id, 'WEB') AS "localKey",
          COUNT(*) FILTER (WHERE fecha_entrega >= ${hoy} AND fecha_entrega < ${manana})::int AS "hoy_cnt",
          COALESCE(SUM(total) FILTER (WHERE fecha_entrega >= ${hoy} AND fecha_entrega < ${manana}), 0)::float8 AS "hoy_total",
          COALESCE(SUM(ganancia_total) FILTER (WHERE fecha_entrega >= ${hoy} AND fecha_entrega < ${manana}), 0)::float8 AS "hoy_gan",
          COUNT(*) FILTER (WHERE fecha_entrega >= ${ayer} AND fecha_entrega < ${hoy})::int AS "ayer_cnt",
          COALESCE(SUM(total) FILTER (WHERE fecha_entrega >= ${ayer} AND fecha_entrega < ${hoy}), 0)::float8 AS "ayer_total",
          COALESCE(SUM(ganancia_total) FILTER (WHERE fecha_entrega >= ${ayer} AND fecha_entrega < ${hoy}), 0)::float8 AS "ayer_gan",
          COUNT(*) FILTER (WHERE fecha_entrega >= ${inicioMes} AND fecha_entrega < ${finMes})::int AS "mes_cnt",
          COALESCE(SUM(total) FILTER (WHERE fecha_entrega >= ${inicioMes} AND fecha_entrega < ${finMes}), 0)::float8 AS "mes_total",
          COALESCE(SUM(ganancia_total) FILTER (WHERE fecha_entrega >= ${inicioMes} AND fecha_entrega < ${finMes}), 0)::float8 AS "mes_gan",
          COUNT(*) FILTER (WHERE fecha_entrega >= ${inicioMesAnterior} AND fecha_entrega < ${finMesAnterior})::int AS "mes_ant_cnt",
          COALESCE(SUM(total) FILTER (WHERE fecha_entrega >= ${inicioMesAnterior} AND fecha_entrega < ${finMesAnterior}), 0)::float8 AS "mes_ant_total",
          COALESCE(SUM(ganancia_total) FILTER (WHERE fecha_entrega >= ${inicioMesAnterior} AND fecha_entrega < ${finMesAnterior}), 0)::float8 AS "mes_ant_gan"
        FROM public.ordenes_servicio
        WHERE deleted_at IS NULL
          AND estado = 'ENTREGADA'::"EstadoOrden"
          AND fecha_entrega IS NOT NULL
          AND (
            (fecha_entrega >= ${ayer} AND fecha_entrega < ${manana})
            OR (fecha_entrega >= ${inicioMesAnterior} AND fecha_entrega < ${finMes})
          )
        GROUP BY COALESCE(local_id, 'WEB')
      `),
    ]);

    const conteos = conteosRows[0] ?? {
      productosStockBajo: 0,
      productosSinMovimiento: 0,
      recibidas: 0,
      enReparacion: 0,
      listas: 0,
    };
    const productosStockBajo = Number(conteos.productosStockBajo ?? 0);
    const productosSinMovimiento = Number(conteos.productosSinMovimiento ?? 0);
    const recibidas = Number(conteos.recibidas ?? 0);
    const enReparacion = Number(conteos.enReparacion ?? 0);
    const listas = Number(conteos.listas ?? 0);

    const hoyAgg = construirAgregado(
      sumarPeriodo(ventasAggRows, localWhere, 'hoy'),
      sumarPeriodo(ordenesAggRows, localWhere, 'hoy'),
    );
    const ayerAgg = construirAgregado(
      sumarPeriodo(ventasAggRows, localWhere, 'ayer'),
      sumarPeriodo(ordenesAggRows, localWhere, 'ayer'),
    );
    const mesAgg = construirAgregado(
      sumarPeriodo(ventasAggRows, localWhere, 'mes'),
      sumarPeriodo(ordenesAggRows, localWhere, 'mes'),
    );
    const mesAnteriorAgg = construirAgregado(
      sumarPeriodo(ventasAggRows, localWhere, 'mes_ant'),
      sumarPeriodo(ordenesAggRows, localWhere, 'mes_ant'),
    );

    const ventasPorLocal = new Map(ventasAggRows.map((row) => [row.localKey, row]));
    const ordenesPorLocal = new Map(ordenesAggRows.map((row) => [row.localKey, row]));

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
      const agg = construirAgregado(
        extraerPeriodoRow(ventasPorLocal.get(bucket.localId), 'mes'),
        extraerPeriodoRow(ordenesPorLocal.get(bucket.localId), 'mes'),
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
