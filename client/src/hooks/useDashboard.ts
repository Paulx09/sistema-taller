import { useState, useEffect, useCallback } from 'react';
import { dashboardService } from '../services/dashboard.service';
import type { DashboardMetrics, ProductoBajoStock, ProductoSinMovimiento } from '../services/dashboard.service';

export function useDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    ventasHoy: 0,
    gananciaHoy: 0,
    productosStockBajo: 0,
    productosSinMovimiento: 0,
    ordenesActivas: 0,
    ordenesDetalle: { recibidas: 0, enReparacion: 0, listas: 0 },
  });
  const [bajoStock, setBajoStock] = useState<ProductoBajoStock[]>([]);
  const [sinMovimiento, setSinMovimiento] = useState<ProductoSinMovimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [diasSinMovimiento, setDiasSinMovimiento] = useState(30);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [metricsData, bajoStockData, sinMovimientoData] = await Promise.all([
        dashboardService.getMetrics(),
        dashboardService.getProductosBajoStock(),
        dashboardService.getProductosSinMovimiento(diasSinMovimiento),
      ]);

      setMetrics(metricsData);
      setBajoStock(bajoStockData);
      setSinMovimiento(sinMovimientoData);
    } catch (error) {
      console.error('Error fetching dashboard data', error);
    } finally {
      setLoading(false);
    }
  }, [diasSinMovimiento]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { 
    metrics, 
    bajoStock, 
    sinMovimiento, 
    loading, 
    diasSinMovimiento, 
    setDiasSinMovimiento,
    refetch: fetchData,
  };
}
