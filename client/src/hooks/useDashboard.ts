import { useState, useEffect } from 'react';
import { dashboardService } from '../services/dashboard.service';
import type { DashboardMetrics, ProductoBajoStock, ProductoSinMovimiento } from '../services/dashboard.service';

export function useDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    ventasHoy: 0,
    gananciaHoy: 0,
    productosStockBajo: 0,
    productosSinMovimiento: 0
  });
  const [bajoStock, setBajoStock] = useState<ProductoBajoStock[]>([]);
  const [sinMovimiento, setSinMovimiento] = useState<ProductoSinMovimiento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [metricsData, bajoStockData, sinMovimientoData] = await Promise.all([
            dashboardService.getMetrics(),
            dashboardService.getProductosBajoStock(),
            dashboardService.getProductosSinMovimiento()
        ]);

        setMetrics(metricsData);
        setBajoStock(bajoStockData);
        setSinMovimiento(sinMovimientoData);
      } catch (error) {
        console.error("Error fetching dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { metrics, bajoStock, sinMovimiento, loading };
}
