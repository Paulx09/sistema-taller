import { useState, useCallback } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboard.service';
import { queryKeys } from '../lib/queryClient';
import { getErrorMessage } from '../lib/utils';

export function useDashboard() {
  const now = new Date();
  const [diasSinMovimiento, setDiasSinMovimiento] = useState(30);
  const [mes, setMes] = useState<number>(() => now.getMonth() + 1);
  const [anio, setAnio] = useState<number>(() => now.getFullYear());
  const [localId, setLocalId] = useState<string>('all');

  const metricsQuery = useQuery({
    queryKey: queryKeys.dashboard.metrics(localId, mes, anio),
    queryFn: () =>
      dashboardService.getMetrics({
        localId: localId === 'all' ? undefined : localId,
        mes,
        anio,
      }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const bajoStockQuery = useQuery({
    queryKey: queryKeys.dashboard.bajoStock,
    queryFn: () => dashboardService.getProductosBajoStock(),
    staleTime: 60_000,
  });

  const sinMovimientoQuery = useQuery({
    queryKey: queryKeys.dashboard.sinMovimiento(diasSinMovimiento, 10),
    queryFn: () => dashboardService.getProductosSinMovimiento(diasSinMovimiento, 10),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });

  const { refetch: refetchMetrics } = metricsQuery;
  const { refetch: refetchBajoStock } = bajoStockQuery;
  const { refetch: refetchSinMovimiento } = sinMovimientoQuery;

  const refetch = useCallback(async () => {
    await Promise.all([refetchMetrics(), refetchBajoStock(), refetchSinMovimiento()]);
  }, [refetchMetrics, refetchBajoStock, refetchSinMovimiento]);

  const firstError = metricsQuery.error ?? bajoStockQuery.error ?? sinMovimientoQuery.error;
  const error = firstError
    ? getErrorMessage(firstError, 'No se pudieron cargar las métricas del dashboard.')
    : null;

  return {
    metrics: metricsQuery.data ?? null,
    bajoStock: bajoStockQuery.data ?? [],
    sinMovimiento: sinMovimientoQuery.data ?? [],
    loading:
      metricsQuery.isFetching || bajoStockQuery.isFetching || sinMovimientoQuery.isFetching,
    loadingSinMovimiento: sinMovimientoQuery.isFetching,
    error,
    diasSinMovimiento,
    setDiasSinMovimiento,
    mes,
    setMes,
    anio,
    setAnio,
    localId,
    setLocalId,
    refetch,
  };
}
