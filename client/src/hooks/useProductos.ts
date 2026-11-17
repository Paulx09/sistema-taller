import { useState, useCallback } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { productoService } from '../services/producto.service';
import { queryKeys } from '../lib/queryClient';
import { getErrorMessage } from '../lib/utils';
import type {
  Producto,
  CrearProductoDto,
  ActualizarProductoDto,
  AjustarStockDto,
  TipoItem,
} from '../types';

export interface UseProductosParams {
  busqueda?: string;
  categoriaId?: string;
  marcaId?: string;
  tipo?: TipoItem;
  esServicio?: boolean;
  bajoStock?: boolean;
  preciosPendientes?: boolean;
  resumen?: boolean;
  incluirUltimoCosto?: boolean;
  skip?: number;
  take?: number;
  enabled?: boolean;
}

export const useProductos = (params?: UseProductosParams) => {
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [fetchingById, setFetchingById] = useState(false);

  // Descomponer params en valores primitivos para evitar re-renders innecesarios
  const {
    busqueda,
    categoriaId,
    marcaId,
    tipo,
    esServicio,
    bajoStock,
    preciosPendientes,
    resumen,
    incluirUltimoCosto,
    skip,
    take,
    enabled = true,
  } = params || {};

  const query = useQuery({
    queryKey: queryKeys.productos({
      busqueda,
      tipo,
      categoriaId,
      marcaId,
      esServicio,
      bajoStock,
      preciosPendientes,
      resumen,
      incluirUltimoCosto,
      skip,
      take,
    }),
    queryFn: () =>
      productoService.getAll({
        busqueda,
        categoriaId,
        marcaId,
        tipo,
        esServicio,
        bajoStock,
        preciosPendientes,
        resumen,
        incluirUltimoCosto,
        skip,
        take,
      }),
    enabled,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const invalidateProductosYDashboard = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.productos() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
    ]);
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: (data: CrearProductoDto | FormData) => productoService.create(data),
    onSuccess: invalidateProductosYDashboard,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ActualizarProductoDto | FormData }) =>
      productoService.update(id, data),
    onSuccess: invalidateProductosYDashboard,
  });

  const ajustarStockMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AjustarStockDto }) =>
      productoService.ajustarStock(id, data),
    onSuccess: invalidateProductosYDashboard,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, force }: { id: string; force: boolean }) =>
      productoService.delete(id, force),
    onSuccess: invalidateProductosYDashboard,
  });

  const { refetch: queryRefetch } = query;
  const refetch = useCallback(async () => {
    setMutationError(null);
    await queryRefetch();
  }, [queryRefetch]);

  const getProductoById = async (id: string): Promise<Producto> => {
    setFetchingById(true);
    setMutationError(null);
    try {
      return await productoService.getById(id);
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al cargar producto');
      setMutationError(errorMsg);
      throw err;
    } finally {
      setFetchingById(false);
    }
  };

  const createProducto = async (data: CrearProductoDto | FormData): Promise<Producto> => {
    setMutationError(null);
    try {
      return await createMutation.mutateAsync(data);
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al crear producto');
      setMutationError(errorMsg);
      throw err;
    }
  };

  const updateProducto = async (
    id: string,
    data: ActualizarProductoDto | FormData
  ): Promise<Producto> => {
    setMutationError(null);
    try {
      return await updateMutation.mutateAsync({ id, data });
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al actualizar producto');
      setMutationError(errorMsg);
      throw err;
    }
  };

  const ajustarStock = async (id: string, data: AjustarStockDto): Promise<Producto> => {
    setMutationError(null);
    try {
      return await ajustarStockMutation.mutateAsync({ id, data });
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al ajustar stock');
      setMutationError(errorMsg);
      throw err;
    }
  };

  const deleteProducto = async (id: string, force: boolean = false): Promise<void> => {
    setMutationError(null);
    try {
      await deleteMutation.mutateAsync({ id, force });
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al eliminar producto');
      setMutationError(errorMsg);
      throw err;
    }
  };

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    ajustarStockMutation.isPending ||
    deleteMutation.isPending ||
    fetchingById;
  const queryError = query.error
    ? getErrorMessage(query.error, 'Error al cargar productos')
    : null;

  return {
    productos: query.data?.productos ?? [],
    total: query.data?.total ?? 0,
    loading: Boolean(enabled && query.isFetching) || isMutating,
    error: mutationError ?? queryError,
    refetch,
    getProductoById,
    createProducto,
    updateProducto,
    ajustarStock,
    deleteProducto,
  };
};
