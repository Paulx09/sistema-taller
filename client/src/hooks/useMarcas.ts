import { useState, useEffect, useCallback } from 'react';
import { marcaService } from '../services/marca.service';
import { getErrorMessage } from '../lib/utils';
import type { Marca, CrearMarcaDto, ActualizarMarcaDto } from '../types';

interface UseMarcasParams {
  busqueda?: string;
  skip?: number;
  take?: number;
}

export const useMarcas = (params?: UseMarcasParams) => {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { busqueda, skip, take } = params || {};

  const fetchMarcas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { marcas: data, total: totalCount } = await marcaService.getAll({ busqueda, skip, take });
      setMarcas(data);
      setTotal(totalCount);
    } catch (err) {
      setError(getErrorMessage(err, 'Error al cargar marcas'));
      console.error('Error fetching marcas:', err);
    } finally {
      setLoading(false);
    }
  }, [busqueda, skip, take]);

  const createMarca = async (data: CrearMarcaDto): Promise<Marca> => {
    setLoading(true);
    setError(null);
    try {
      const nuevaMarca = await marcaService.create(data);
      setMarcas((prev) => [...prev, nuevaMarca].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      return nuevaMarca;
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al crear marca');
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateMarca = async (id: string, data: ActualizarMarcaDto): Promise<Marca> => {
    setLoading(true);
    setError(null);
    try {
      const marcaActualizada = await marcaService.update(id, data);
      setMarcas((prev) =>
        prev
          .map((m) => (m.id === id ? marcaActualizada : m))
          .sort((a, b) => a.nombre.localeCompare(b.nombre))
      );
      return marcaActualizada;
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al actualizar marca');
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteMarca = async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await marcaService.delete(id);
      setMarcas((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al eliminar marca');
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarcas();
  }, [fetchMarcas]);

  return {
    marcas,
    total,
    loading,
    error,
    refetch: fetchMarcas,
    createMarca,
    updateMarca,
    deleteMarca,
  };
};
