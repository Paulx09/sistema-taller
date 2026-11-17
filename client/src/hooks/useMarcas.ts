import { useState, useCallback } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { marcaService } from '../services/marca.service';
import { queryKeys } from '../lib/queryClient';
import { getErrorMessage } from '../lib/utils';
import type { Marca, CrearMarcaDto, ActualizarMarcaDto } from '../types';

export interface UseMarcasParams {
  busqueda?: string;
  skip?: number;
  take?: number;
  enabled?: boolean;
}

export const useMarcas = (params?: UseMarcasParams) => {
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { busqueda, skip, take, enabled = true } = params || {};

  const query = useQuery({
    queryKey: queryKeys.marcas({ busqueda, skip, take }),
    queryFn: () => marcaService.getAll({ busqueda, skip, take }),
    enabled,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (data: CrearMarcaDto) => marcaService.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.marcas() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ActualizarMarcaDto }) =>
      marcaService.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.marcas() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => marcaService.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.marcas() });
    },
  });

  const refetch = useCallback(async () => {
    setMutationError(null);
    await query.refetch();
  }, [query]);

  const createMarca = async (data: CrearMarcaDto): Promise<Marca> => {
    setMutationError(null);
    try {
      return await createMutation.mutateAsync(data);
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al crear marca');
      setMutationError(errorMsg);
      throw err;
    }
  };

  const updateMarca = async (id: string, data: ActualizarMarcaDto): Promise<Marca> => {
    setMutationError(null);
    try {
      return await updateMutation.mutateAsync({ id, data });
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al actualizar marca');
      setMutationError(errorMsg);
      throw err;
    }
  };

  const deleteMarca = async (id: string): Promise<void> => {
    setMutationError(null);
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al eliminar marca');
      setMutationError(errorMsg);
      throw err;
    }
  };

  const isMutating =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const queryError = query.error
    ? getErrorMessage(query.error, 'Error al cargar marcas')
    : null;

  return {
    marcas: query.data?.marcas ?? [],
    total: query.data?.total ?? 0,
    loading: query.isFetching || isMutating,
    error: mutationError ?? queryError,
    refetch,
    createMarca,
    updateMarca,
    deleteMarca,
  };
};
