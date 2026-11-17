import { useState, useCallback } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ubicacionService } from '../services/ubicacion.service';
import { queryKeys } from '../lib/queryClient';
import { getErrorMessage } from '../lib/utils';
import type { Ubicacion, CrearUbicacionDto, ActualizarUbicacionDto } from '../types';

export interface UseUbicacionesParams {
  skip?: number;
  take?: number;
  enabled?: boolean;
}

export const useUbicaciones = (params?: UseUbicacionesParams) => {
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { skip, take, enabled = true } = params || {};

  const query = useQuery({
    queryKey: queryKeys.ubicaciones({ skip, take }),
    queryFn: () => ubicacionService.getAll({ skip, take }),
    enabled,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (data: CrearUbicacionDto) => ubicacionService.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.ubicaciones() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ActualizarUbicacionDto }) =>
      ubicacionService.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.ubicaciones() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ubicacionService.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.ubicaciones() });
    },
  });

  const refetch = useCallback(async () => {
    setMutationError(null);
    await query.refetch();
  }, [query]);

  const createUbicacion = async (data: CrearUbicacionDto): Promise<Ubicacion> => {
    setMutationError(null);
    try {
      return await createMutation.mutateAsync(data);
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al crear ubicación');
      setMutationError(errorMsg);
      throw err;
    }
  };

  const updateUbicacion = async (id: string, data: ActualizarUbicacionDto): Promise<Ubicacion> => {
    setMutationError(null);
    try {
      return await updateMutation.mutateAsync({ id, data });
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al actualizar ubicación');
      setMutationError(errorMsg);
      throw err;
    }
  };

  const deleteUbicacion = async (id: string): Promise<void> => {
    setMutationError(null);
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al eliminar ubicación');
      setMutationError(errorMsg);
      throw err;
    }
  };

  const isMutating =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const queryError = query.error
    ? getErrorMessage(query.error, 'Error al cargar ubicaciones')
    : null;

  return {
    ubicaciones: query.data?.ubicaciones ?? [],
    total: query.data?.total ?? 0,
    loading: query.isFetching || isMutating,
    error: mutationError ?? queryError,
    refetch,
    createUbicacion,
    updateUbicacion,
    deleteUbicacion,
  };
};
