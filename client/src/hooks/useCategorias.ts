import { useState, useCallback } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { categoriaService } from '../services/categoria.service';
import { queryKeys } from '../lib/queryClient';
import { getErrorMessage } from '../lib/utils';
import type { Categoria, TipoItem, CrearCategoriaDto, ActualizarCategoriaDto } from '../types';

export interface UseCategoriasParams {
  tipo?: TipoItem;
  skip?: number;
  take?: number;
  limit?: number;
  todas?: boolean;
  enabled?: boolean;
}

export const useCategorias = (params?: UseCategoriasParams) => {
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { tipo, skip, take, limit, todas, enabled = true } = params || {};

  const query = useQuery({
    queryKey: queryKeys.categorias({ tipo, skip, take, limit, todas }),
    queryFn: () => categoriaService.getAll({ tipo, skip, take, limit, todas }),
    enabled,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (data: CrearCategoriaDto) => categoriaService.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.categorias() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ActualizarCategoriaDto }) =>
      categoriaService.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.categorias() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriaService.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.categorias() });
    },
  });

  const refetch = useCallback(async () => {
    setMutationError(null);
    await query.refetch();
  }, [query]);

  const createCategoria = async (data: CrearCategoriaDto): Promise<Categoria> => {
    setMutationError(null);
    try {
      return await createMutation.mutateAsync(data);
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al crear categoría');
      setMutationError(errorMsg);
      throw err;
    }
  };

  const updateCategoria = async (id: string, data: ActualizarCategoriaDto): Promise<Categoria> => {
    setMutationError(null);
    try {
      return await updateMutation.mutateAsync({ id, data });
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al actualizar categoría');
      setMutationError(errorMsg);
      throw err;
    }
  };

  const deleteCategoria = async (id: string): Promise<void> => {
    setMutationError(null);
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al eliminar categoría');
      setMutationError(errorMsg);
      throw err;
    }
  };

  const isMutating =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const queryError = query.error
    ? getErrorMessage(query.error, 'Error al cargar categorías')
    : null;

  return {
    categorias: query.data?.categorias ?? [],
    total: query.data?.total ?? 0,
    loading: query.isFetching || isMutating,
    error: mutationError ?? queryError,
    refetch,
    createCategoria,
    updateCategoria,
    deleteCategoria,
  };
};
