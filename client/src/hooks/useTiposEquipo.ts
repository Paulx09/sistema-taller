import { useState, useCallback } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { tipoEquipoService } from '../services/tipo-equipo.service';
import { queryKeys } from '../lib/queryClient';
import { getErrorMessage } from '../lib/utils';
import type { TipoEquipo, CrearTipoEquipoDto, ActualizarTipoEquipoDto } from '../types';

export interface UseTiposEquipoParams {
  busqueda?: string;
  activo?: boolean;
  skip?: number;
  take?: number;
  enabled?: boolean;
}

export const useTiposEquipo = (params?: UseTiposEquipoParams) => {
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { busqueda, activo, skip, take, enabled = true } = params || {};

  const query = useQuery({
    queryKey: queryKeys.tiposEquipo({ busqueda, activo, skip, take }),
    queryFn: () => tipoEquipoService.getAll({ busqueda, activo, skip, take }),
    enabled,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (data: CrearTipoEquipoDto) => tipoEquipoService.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tiposEquipo() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ActualizarTipoEquipoDto }) =>
      tipoEquipoService.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tiposEquipo() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tipoEquipoService.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tiposEquipo() });
    },
  });

  const refetch = useCallback(async () => {
    setMutationError(null);
    await query.refetch();
  }, [query]);

  const createTipoEquipo = async (data: CrearTipoEquipoDto): Promise<TipoEquipo> => {
    setMutationError(null);
    try {
      return await createMutation.mutateAsync(data);
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al crear tipo de equipo');
      setMutationError(errorMsg);
      throw err;
    }
  };

  const updateTipoEquipo = async (id: string, data: ActualizarTipoEquipoDto): Promise<TipoEquipo> => {
    setMutationError(null);
    try {
      return await updateMutation.mutateAsync({ id, data });
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al actualizar tipo de equipo');
      setMutationError(errorMsg);
      throw err;
    }
  };

  const deleteTipoEquipo = async (id: string): Promise<void> => {
    setMutationError(null);
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al eliminar tipo de equipo');
      setMutationError(errorMsg);
      throw err;
    }
  };

  const isMutating =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const queryError = query.error
    ? getErrorMessage(query.error, 'Error al cargar tipos de equipo')
    : null;

  return {
    tiposEquipo: query.data?.tiposEquipo ?? [],
    total: query.data?.total ?? 0,
    loading: query.isFetching || isMutating,
    error: mutationError ?? queryError,
    refetch,
    createTipoEquipo,
    updateTipoEquipo,
    deleteTipoEquipo,
  };
};
