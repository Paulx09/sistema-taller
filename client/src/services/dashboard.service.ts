import api from './api';

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
}

export interface ProductoBajoStock {
  id: string;
  nombre: string;
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
  getMetrics: async (): Promise<DashboardMetrics> => {
    try {
      const response = await api.get('/dashboard/metricas');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      // Fallback en caso de error
      return {
        ventasHoy: 0,
        ventasAyer: 0,
        gananciaHoy: 0,
        gananciaAyer: 0,
        variacionVentasPct: 0,
        variacionGananciaPct: 0,
        margenNetoHoyPct: 0,
        productosStockBajo: 0,
        productosSinMovimiento: 0,
        ordenesActivas: 0,
        ordenesDetalle: { recibidas: 0, enReparacion: 0, listas: 0 },
      };
    }
  },

  getProductosBajoStock: async (): Promise<ProductoBajoStock[]> => {
    try {
      const response = await api.get('/productos/bajo-stock');
      return Array.isArray(response.data.data) ? response.data.data : [];
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      return [];
    }
  },

  getProductosSinMovimiento: async (dias: number = 90): Promise<ProductoSinMovimiento[]> => {
    try {
      const response = await api.get(`/productos/sin-movimiento?dias=${dias}`);
      return Array.isArray(response.data.data) ? response.data.data : [];
    } catch (error) {
      console.error('Error fetching stagnant products:', error);
      return [];
    }
  },
};
