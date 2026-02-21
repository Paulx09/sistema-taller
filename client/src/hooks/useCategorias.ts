import { useState, useEffect, useCallback } from 'react';
import { categoriaService } from '../services/categoria.service';
import { getErrorMessage } from '../lib/utils';
import type { Categoria, CrearCategoriaDto, ActualizarCategoriaDto } from '../types';

interface UseCategoriasParams {
  skip?: number;
  take?: number;
}

export const useCategorias = (params?: UseCategoriasParams) => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Descomponer params en valores primitivos para evitar re-renders innecesarios
  const { skip, take } = params || {};

  const fetchCategorias = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { categorias: data, total: totalCount } = await categoriaService.getAll({ skip, take });
      setCategorias(data);
      setTotal(totalCount);
    } catch (err) {
      setError(getErrorMessage(err, 'Error al cargar categorías'));
      console.error('Error fetching categorias:', err);
    } finally {
      setLoading(false);
    }
  }, [skip, take]);

  const createCategoria = async (data: CrearCategoriaDto): Promise<Categoria> => {
    setLoading(true);
    setError(null);
    try {
      const nuevaCategoria = await categoriaService.create(data);
      setCategorias((prev) => [...prev, nuevaCategoria]);
      return nuevaCategoria;
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al crear categoría');
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateCategoria = async (id: string, data: ActualizarCategoriaDto): Promise<Categoria> => {
    setLoading(true);
    setError(null);
    try {
      const categoriaActualizada = await categoriaService.update(id, data);
      setCategorias((prev) =>
        prev.map((c) => (c.id === id ? categoriaActualizada : c))
      );
      return categoriaActualizada;
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al actualizar categoría');
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteCategoria = async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await categoriaService.delete(id);
      setCategorias((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al eliminar categoría');
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategorias();
  }, [fetchCategorias]);

  return {
    categorias,
    total,
    loading,
    error,
    refetch: fetchCategorias,
    createCategoria,
    updateCategoria,
    deleteCategoria,
  };
};
