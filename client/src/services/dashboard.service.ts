import axios from 'axios';

const API_URL = 'http://localhost:3000/api'; // TODO: Usar variable de entorno

export interface DashboardMetrics {
  ventasHoy: number;
  gananciaHoy: number; // Por ahora será 0 o mock
  productosStockBajo: number;
  productosSinMovimiento: number;
}

export interface ProductoBajoStock {
  id: string;
  nombre: string;
  sku: string;
  stockActual: number;
  stockMinimo: number;
  ubicacion: { nombre: string } | null;
}

export interface ProductoSinMovimiento {
    id: string;
    nombre: string;
    ultimaVenta?: string; // Fecha
    diasSinMovimiento: number;
}


export const dashboardService = {
  getMetrics: async (): Promise<DashboardMetrics> => {
    // Por ahora mockeamos lo que no existe en backend o si falla
    try {
        const response = await axios.get(`${API_URL}/dashboard/metricas`);
        return response.data;
    } catch (error) {
        console.warn("Dashboard metrics endpoint not ready, using mock/partial data");
        // Fallback or partial data fetching if strict endpoint doesn't exist yet
        // We can fetch products to calc stock low count at least
        const productsResponse = await axios.get(`${API_URL}/productos/bajo-stock`);
        return {
            ventasHoy: 0,
            gananciaHoy: 0,
            productosStockBajo: productsResponse.data.length,
            productosSinMovimiento: 0
        };
    }
  },

  getProductosBajoStock: async (): Promise<ProductoBajoStock[]> => {
      try {
        const response = await axios.get(`${API_URL}/productos/bajo-stock`);
        return Array.isArray(response.data) ? response.data : [];
      } catch (error) {
        console.error("Error fetching low stock products:", error);
        return [];
      }
  },
  
  getProductosSinMovimiento: async (): Promise<ProductoSinMovimiento[]> => {
      // Endpoint puede no existir aun, retornamos vacio por seguridad
      try {
        const response = await axios.get(`${API_URL}/productos/sin-movimiento`);
        return Array.isArray(response.data) ? response.data : [];
      } catch {
          return [];
      }
  }
};
