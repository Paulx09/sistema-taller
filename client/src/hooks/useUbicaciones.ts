import { useState, useEffect, useCallback } from 'react';
import { ubicacionService } from '../services/ubicacion.service';
import { getErrorMessage } from '../lib/utils';
import type { Ubicacion, CrearUbicacionDto, ActualizarUbicacionDto } from '../types';

interface UseUbicacionesParams {
  skip?: number;
  take?: number;
}

export const useUbicaciones = (params?: UseUbicacionesParams) => {
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Descomponer params en valores primitivos para evitar re-renders innecesarios
  const { skip, take } = params || {};

  const fetchUbicaciones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { ubicaciones: data, total: totalCount } = await ubicacionService.getAll({ skip, take });
      setUbicaciones(data);
      setTotal(totalCount);
    } catch (err) {
      setError(getErrorMessage(err, 'Error al cargar ubicaciones'));
      console.error('Error fetching ubicaciones:', err);
    } finally {
      setLoading(false);
    }
  }, [skip, take]);

  const createUbicacion = async (data: CrearUbicacionDto): Promise<Ubicacion> => {
    setLoading(true);
    setError(null);
    try {
      const nuevaUbicacion = await ubicacionService.create(data);
      setUbicaciones((prev) => [...prev, nuevaUbicacion]);
      return nuevaUbicacion;
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al crear ubicación');
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateUbicacion = async (id: string, data: ActualizarUbicacionDto): Promise<Ubicacion> => {
    setLoading(true);
    setError(null);
    try {
      const ubicacionActualizada = await ubicacionService.update(id, data);
      setUbicaciones((prev) =>
        prev.map((u) => (u.id === id ? ubicacionActualizada : u))
      );
      return ubicacionActualizada;
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al actualizar ubicación');
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteUbicacion = async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await ubicacionService.delete(id);
      setUbicaciones((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al eliminar ubicación');
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUbicaciones();
  }, [fetchUbicaciones]);

  return {
    ubicaciones,
    total,
    loading,
    error,
    refetch: fetchUbicaciones,
    createUbicacion,
    updateUbicacion,
    deleteUbicacion,
  };
};
