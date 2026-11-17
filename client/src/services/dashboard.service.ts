import api from './api';

export interface DashboardMetricsParams {
  localId?: string;
  mes?: number;
  anio?: number;
}

export interface ResumenMensualDashboard {
  mes: number;
  anio: number;
  totalVentas: number;
  totalOrdenesEntregadas: number;
  ingresosVentas: number;
  ingresosOrdenes: number;
  ingresosTotales: number;
  gananciaVentas: number;
  gananciaOrdenes: number;
  gananciaTotal: number;
  margenNetoPct: number;
  ticketPromedio: number;
  variacionIngresosPct: number | null;
  variacionGananciaPct: number | null;
}

export interface RendimientoLocalDashboard {
  localId: string;
  codigo: string;
  nombre: string;
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

export interface DashboardMetrics {
  ventasHoy: number;
  ventasAyer: number;
  gananciaHoy: number;
  gananciaAyer: number;
  variacionVentasPct: number | null;
  variacionGananciaPct: number | null;
  margenNetoHoyPct: number;
  productosStockBajo: number;
  productosSinMovimiento: number;
  ordenesActivas: number;
  ordenesDetalle: { recibidas: number; enReparacion: number; listas: number };
  resumenMensual: ResumenMensualDashboard;
  rendimientoPorLocal: RendimientoLocalDashboard[];
}

export interface ProductoBajoStock {
  id: string;
  nombre: string;
  descripcion?: string | null;
  tipo?: string;
  sku: string | null;
  marca: string | null;
  modelo: string | null;
  stockActual: number;
  stockMinimo: number;
  ubicacion: { nombre: string } | null;
}

export interface ProductoSinMovimiento {
  id: string;
  nombre: string;
  stockActual: number;
  categoria: { nombre: string } | null;
  ultimaVenta: string | null; // Fecha
  diasSinMovimiento: number;
}

export const dashboardService = {
  getMetrics: async (params?: DashboardMetricsParams): Promise<DashboardMetrics> => {
    const queryParams: Record<string, string | number> = {};
    if (params?.localId && params.localId !== 'all') {
      queryParams.localId = params.localId;
    }
    if (params?.mes !== undefined) {
      queryParams.mes = params.mes;
    }
    if (params?.anio !== undefined) {
      queryParams.anio = params.anio;
    }

    const response = await api.get<{ success: boolean; data: DashboardMetrics }>(
      '/dashboard/metricas',
      { params: queryParams }
    );
    return response.data.data;
  },

  getProductosBajoStock: async (): Promise<ProductoBajoStock[]> => {
    const response = await api.get('/productos/bajo-stock');
    return Array.isArray(response.data.data) ? response.data.data : [];
  },

  getProductosSinMovimiento: async (
    dias: number = 90,
    limit: number = 10
  ): Promise<ProductoSinMovimiento[]> => {
    const response = await api.get(`/productos/sin-movimiento?dias=${dias}&limit=${limit}`);
    return Array.isArray(response.data.data) ? response.data.data : [];
  },
};
