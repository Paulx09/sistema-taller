import { useState, useCallback } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { clienteService } from '../services/cliente.service';
import { queryKeys } from '../lib/queryClient';
import { getErrorMessage } from '../lib/utils';
import type { Cliente, CrearClienteDto, ActualizarClienteDto } from '../types';

export interface UseClientesParams {
  busqueda?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export const useClientes = (params?: UseClientesParams) => {
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { busqueda, page, limit, enabled = true } = params || {};
  const effectiveBusqueda = busqueda || undefined;
  const effectiveLimit = limit || 100;

  const query = useQuery({
    queryKey: queryKeys.clientes({ busqueda: effectiveBusqueda, page, limit: effectiveLimit }),
    queryFn: () =>
      clienteService.getAll({
        busqueda: effectiveBusqueda,
        page,
        limit: effectiveLimit,
      }),
    enabled,
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (data: CrearClienteDto) => clienteService.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.clientes() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ActualizarClienteDto }) =>
      clienteService.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.clientes() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clienteService.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.clientes() });
    },
  });

  const { refetch: queryRefetch } = query;
  const refetch = useCallback(async () => {
    setMutationError(null);
    await queryRefetch();
  }, [queryRefetch]);

  const createCliente = async (data: CrearClienteDto): Promise<Cliente> => {
    setMutationError(null);
    try {
      return await createMutation.mutateAsync(data);
    } catch (err) {
      const msg = getErrorMessage(err, 'Error al crear cliente');
      setMutationError(msg);
      throw err;
    }
  };

  const updateCliente = async (id: string, data: ActualizarClienteDto): Promise<Cliente> => {
    setMutationError(null);
    try {
      return await updateMutation.mutateAsync({ id, data });
    } catch (err) {
      const msg = getErrorMessage(err, 'Error al actualizar cliente');
      setMutationError(msg);
      throw err;
    }
  };

  const deleteCliente = async (id: string): Promise<void> => {
    setMutationError(null);
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      const msg = getErrorMessage(err, 'Error al eliminar cliente');
      setMutationError(msg);
      throw err;
    }
  };

  const isMutating =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const queryError = query.error
    ? getErrorMessage(query.error, 'Error al cargar clientes')
    : null;

  return {
    clientes: query.data?.clientes ?? [],
    total: query.data?.total ?? 0,
    loading: Boolean(enabled && query.isFetching) || isMutating,
    error: mutationError ?? queryError,
    refetch,
    createCliente,
    updateCliente,
    deleteCliente,
  };
};
