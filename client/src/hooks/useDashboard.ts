import { useState, useEffect, useCallback } from 'react';
import { dashboardService } from '../services/dashboard.service';
import type {
  DashboardMetrics,
  ProductoBajoStock,
  ProductoSinMovimiento,
} from '../services/dashboard.service';

export function useDashboard() {
  const now = new Date();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [bajoStock, setBajoStock] = useState<ProductoBajoStock[]>([]);
  const [sinMovimiento, setSinMovimiento] = useState<ProductoSinMovimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diasSinMovimiento, setDiasSinMovimiento] = useState(30);
  const [mes, setMes] = useState<number>(() => now.getMonth() + 1);
  const [anio, setAnio] = useState<number>(() => now.getFullYear());
  const [localId, setLocalId] = useState<string>('all');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [metricsData, bajoStockData, sinMovimientoData] = await Promise.all([
        dashboardService.getMetrics({ localId, mes, anio }),
        dashboardService.getProductosBajoStock(),
        dashboardService.getProductosSinMovimiento(diasSinMovimiento),
      ]);

      setMetrics(metricsData);
      setBajoStock(bajoStockData);
      setSinMovimiento(sinMovimientoData);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data
          ?.error ||
        (err as { message?: string })?.message ||
        'No se pudieron cargar las métricas del dashboard.';
      console.error('Error fetching dashboard data:', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [diasSinMovimiento, localId, mes, anio]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    metrics,
    bajoStock,
    sinMovimiento,
    loading,
    error,
    diasSinMovimiento,
    setDiasSinMovimiento,
    mes,
    setMes,
    anio,
    setAnio,
    localId,
    setLocalId,
    refetch: fetchData,
  };
}
