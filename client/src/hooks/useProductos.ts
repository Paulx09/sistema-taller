import { useState, useEffect, useCallback } from 'react';
import { productoService } from '../services/producto.service';
import { getErrorMessage } from '../lib/utils';
import type { Producto, CrearProductoDto, ActualizarProductoDto, AjustarStockDto } from '../types';

interface UseProductosParams {
  busqueda?: string;
  categoriaId?: string;
  esServicio?: boolean;
  bajoStock?: boolean;
  skip?: number;
  take?: number;
}

export const useProductos = (params?: UseProductosParams) => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Descomponer params en valores primitivos para evitar re-renders innecesarios
  const { busqueda, categoriaId, esServicio, bajoStock, skip, take } = params || {};

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { productos: data, total: totalCount } = await productoService.getAll({
        busqueda,
        categoriaId,
        esServicio,
        bajoStock,
        skip,
        take,
      });
      setProductos(data);
      setTotal(totalCount);
    } catch (err) {
      setError(getErrorMessage(err, 'Error al cargar productos'));
      console.error('Error fetching productos:', err);
    } finally {
      setLoading(false);
    }
  }, [busqueda, categoriaId, esServicio, bajoStock, skip, take]);

  const getProductoById = async (id: string): Promise<Producto> => {
    setLoading(true);
    setError(null);
    try {
      return await productoService.getById(id);
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al cargar producto');
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createProducto = async (data: CrearProductoDto | FormData): Promise<Producto> => {
    setLoading(true);
    setError(null);
    try {
      const nuevoProducto = await productoService.create(data);
      setProductos((prev) => [...prev, nuevoProducto]);
      setTotal((prev) => prev + 1);
      return nuevoProducto;
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al crear producto');
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateProducto = async (id: string, data: ActualizarProductoDto | FormData): Promise<Producto> => {
    setLoading(true);
    setError(null);
    try {
      const productoActualizado = await productoService.update(id, data);
      setProductos((prev) =>
        prev.map((p) => (p.id === id ? productoActualizado : p))
      );
      return productoActualizado;
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al actualizar producto');
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const ajustarStock = async (id: string, data: AjustarStockDto): Promise<Producto> => {
    setLoading(true);
    setError(null);
    try {
      const productoActualizado = await productoService.ajustarStock(id, data);
      setProductos((prev) =>
        prev.map((p) => (p.id === id ? productoActualizado : p))
      );
      return productoActualizado;
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al ajustar stock');
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteProducto = async (id: string, force: boolean = false): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await productoService.delete(id, force);
      setProductos((prev) => prev.filter((p) => p.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al eliminar producto');
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  return {
    productos,
    total,
    loading,
    error,
    refetch: fetchProductos,
    getProductoById,
    createProducto,
    updateProducto,
    ajustarStock,
    deleteProducto,
  };
};
