import { useState, useCallback } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ordenServicioService, type GetOrdenesParams } from '@/services/orden-servicio.service';
import { queryKeys } from '@/lib/queryClient';
import { getErrorMessage } from '@/lib/utils';
import type { EstadoOrden, CrearOrdenDto } from '@/types';

export interface FiltrosOrdenes {
  estado: EstadoOrden | '';
  localId: string;
  desde: string;
  hasta: string;
  busqueda: string;
  page: number;
  limit: number;
}

const FILTROS_INICIALES: FiltrosOrdenes = {
  estado: '',
  localId: '',
  desde: '',
  hasta: '',
  busqueda: '',
  page: 1,
  limit: 20,
};

export function useOrdenesServicio() {
  const queryClient = useQueryClient();
  const [filtros, setFiltros] = useState<FiltrosOrdenes>(FILTROS_INICIALES);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.ordenesServicio({ ...filtros }),
    queryFn: () => {
      const params: GetOrdenesParams = {
        ...(filtros.estado ? { estado: filtros.estado } : {}),
        ...(filtros.localId ? { localId: filtros.localId } : {}),
        ...(filtros.desde ? { desde: filtros.desde } : {}),
        ...(filtros.hasta ? { hasta: filtros.hasta } : {}),
        ...(filtros.busqueda ? { busqueda: filtros.busqueda } : {}),
        page: filtros.page,
        limit: filtros.limit,
      };
      return ordenServicioService.getAll(params);
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const invalidateOrdenesYDashboard = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.ordenesServicio() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
    ]);
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: (data: CrearOrdenDto) => ordenServicioService.create(data),
    onSuccess: invalidateOrdenesYDashboard,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ordenServicioService.delete(id),
    onSuccess: invalidateOrdenesYDashboard,
  });

  const aplicarFiltros = useCallback((nuevosFiltros: Partial<FiltrosOrdenes>) => {
    setFiltros((prev) => ({ ...prev, ...nuevosFiltros, page: 1 }));
  }, []);

  const limpiarFiltros = useCallback(() => {
    setFiltros(FILTROS_INICIALES);
  }, []);

  const cambiarPagina = useCallback((page: number) => {
    setFiltros((prev) => ({ ...prev, page }));
  }, []);

  const { refetch: queryRefetch } = query;
  const refetch = useCallback(async () => {
    setMutationError(null);
    await queryRefetch();
  }, [queryRefetch]);

  const { mutateAsync: createMutateAsync } = createMutation;
  const createOrden = useCallback(
    async (data: CrearOrdenDto) => {
      setMutationError(null);
      try {
        return await createMutateAsync(data);
      } catch (err) {
        setMutationError(getErrorMessage(err, 'Error al crear orden de servicio'));
        throw err;
      }
    },
    [createMutateAsync]
  );

  const { mutateAsync: deleteMutateAsync } = deleteMutation;
  const deleteOrden = useCallback(
    async (id: string) => {
      setMutationError(null);
      try {
        await deleteMutateAsync(id);
      } catch (err) {
        setMutationError(getErrorMessage(err, 'Error al eliminar orden de servicio'));
        throw err;
      }
    },
    [deleteMutateAsync]
  );

  const queryError = query.error
    ? getErrorMessage(query.error, 'Error al cargar órdenes de servicio')
    : null;

  return {
    ordenes: query.data?.ordenes ?? [],
    total: query.data?.total ?? 0,
    loading: query.isFetching || createMutation.isPending || deleteMutation.isPending,
    error: mutationError ?? queryError,
    filtros,
    aplicarFiltros,
    limpiarFiltros,
    cambiarPagina,
    refetch,
    createOrden,
    deleteOrden,
  };
}
