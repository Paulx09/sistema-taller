import { useState, useCallback, useEffect } from 'react';
import { ordenServicioService, type GetOrdenesParams } from '@/services/orden-servicio.service';
import type { OrdenServicioResumen, EstadoOrden, CrearOrdenDto } from '@/types';

export interface FiltrosOrdenes {
  estado: EstadoOrden | '';
  desde: string;
  hasta: string;
  busqueda: string;
  page: number;
  limit: number;
}

const FILTROS_INICIALES: FiltrosOrdenes = {
  estado: '',
  desde: '',
  hasta: '',
  busqueda: '',
  page: 1,
  limit: 20,
};

export function useOrdenesServicio() {
  const [ordenes, setOrdenes] = useState<OrdenServicioResumen[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosOrdenes>(FILTROS_INICIALES);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: GetOrdenesParams = {
        ...(filtros.estado ? { estado: filtros.estado } : {}),
        ...(filtros.desde ? { desde: filtros.desde } : {}),
        ...(filtros.hasta ? { hasta: filtros.hasta } : {}),
        ...(filtros.busqueda ? { busqueda: filtros.busqueda } : {}),
        page: filtros.page,
        limit: filtros.limit,
      };
      const { ordenes: data, total: t } = await ordenServicioService.getAll(params);
      setOrdenes(data);
      setTotal(t);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar órdenes de servicio');
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const aplicarFiltros = useCallback((nuevosFiltros: Partial<FiltrosOrdenes>) => {
    setFiltros((prev) => ({ ...prev, ...nuevosFiltros, page: 1 }));
  }, []);

  const limpiarFiltros = useCallback(() => {
    setFiltros(FILTROS_INICIALES);
  }, []);

  const cambiarPagina = useCallback((page: number) => {
    setFiltros((prev) => ({ ...prev, page }));
  }, []);

  const createOrden = useCallback(
    async (data: CrearOrdenDto) => {
      const orden = await ordenServicioService.create(data);
      await cargar();
      return orden;
    },
    [cargar]
  );

  const deleteOrden = useCallback(
    async (id: string) => {
      await ordenServicioService.delete(id);
      await cargar();
    },
    [cargar]
  );

  return {
    ordenes,
    total,
    loading,
    error,
    filtros,
    aplicarFiltros,
    limpiarFiltros,
    cambiarPagina,
    refetch: cargar,
    createOrden,
    deleteOrden,
  };
}
