import api from './api';

export interface DashboardMetrics {
  ventasHoy: number;
  gananciaHoy: number; // Por ahora será 0 o mock
  productosStockBajo: number;
  productosSinMovimiento: number;
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
        gananciaHoy: 0,
        productosStockBajo: 0,
        productosSinMovimiento: 0,
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
