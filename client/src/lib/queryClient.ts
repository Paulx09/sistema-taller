import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const queryKeys = {
  locales: ['locales'] as const,
  categorias: (params?: Record<string, unknown>) =>
    params ? (['categorias', params] as const) : (['categorias'] as const),
  marcas: (params?: Record<string, unknown>) =>
    params ? (['marcas', params] as const) : (['marcas'] as const),
  ubicaciones: (params?: Record<string, unknown>) =>
    params ? (['ubicaciones', params] as const) : (['ubicaciones'] as const),
  tiposEquipo: (params?: Record<string, unknown>) =>
    params ? (['tipos-equipo', params] as const) : (['tipos-equipo'] as const),
  dashboard: {
    all: ['dashboard'] as const,
    metrics: (localId: string, mes: number, anio: number) =>
      ['dashboard', 'metrics', { localId, mes, anio }] as const,
    bajoStock: ['dashboard', 'bajo-stock'] as const,
    sinMovimiento: (dias: number, limit = 10) =>
      ['dashboard', 'sin-movimiento', { dias, limit }] as const,
  },
  productos: (params?: Record<string, unknown>) =>
    params ? (['productos', params] as const) : (['productos'] as const),
  ordenesServicio: (params?: Record<string, unknown>) =>
    params ? (['ordenes-servicio', params] as const) : (['ordenes-servicio'] as const),
  clientes: (params?: Record<string, unknown>) =>
    params ? (['clientes', params] as const) : (['clientes'] as const),
  ventas: {
    all: ['ventas'] as const,
    hoy: ['ventas', 'hoy'] as const,
    historial: (params?: Record<string, unknown>) =>
      params ? (['ventas', 'historial', params] as const) : (['ventas', 'historial'] as const),
  },
  compras: (params?: Record<string, unknown>) =>
    params ? (['compras', params] as const) : (['compras'] as const),
  proveedores: (params?: Record<string, unknown>) =>
    params ? (['proveedores', params] as const) : (['proveedores'] as const),
};
