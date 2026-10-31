import { useState, useEffect, useCallback } from 'react';
import { tipoEquipoService } from '../services/tipo-equipo.service';
import { getErrorMessage } from '../lib/utils';
import type { TipoEquipo, CrearTipoEquipoDto, ActualizarTipoEquipoDto } from '../types';

interface UseTiposEquipoParams {
  busqueda?: string;
  activo?: boolean;
  skip?: number;
  take?: number;
}

export const useTiposEquipo = (params?: UseTiposEquipoParams) => {
  const [tiposEquipo, setTiposEquipo] = useState<TipoEquipo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { busqueda, activo, skip, take } = params || {};

  const fetchTiposEquipo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { tiposEquipo: data, total: totalCount } = await tipoEquipoService.getAll({
        busqueda,
        activo,
        skip,
        take,
      });
      setTiposEquipo(data);
      setTotal(totalCount);
    } catch (err) {
      setError(getErrorMessage(err, 'Error al cargar tipos de equipo'));
      console.error('Error fetching tiposEquipo:', err);
    } finally {
      setLoading(false);
    }
  }, [busqueda, activo, skip, take]);

  const createTipoEquipo = async (data: CrearTipoEquipoDto): Promise<TipoEquipo> => {
    setLoading(true);
    setError(null);
    try {
      const nuevo = await tipoEquipoService.create(data);
      setTiposEquipo((prev) => [...prev, nuevo]);
      return nuevo;
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al crear tipo de equipo');
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateTipoEquipo = async (id: string, data: ActualizarTipoEquipoDto): Promise<TipoEquipo> => {
    setLoading(true);
    setError(null);
    try {
      const actualizado = await tipoEquipoService.update(id, data);
      setTiposEquipo((prev) =>
        prev.map((t) => (t.id === id ? actualizado : t))
      );
      return actualizado;
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al actualizar tipo de equipo');
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteTipoEquipo = async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await tipoEquipoService.delete(id);
      setTiposEquipo((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Error al eliminar tipo de equipo');
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTiposEquipo();
  }, [fetchTiposEquipo]);

  return {
    tiposEquipo,
    total,
    loading,
    error,
    refetch: fetchTiposEquipo,
    createTipoEquipo,
    updateTipoEquipo,
    deleteTipoEquipo,
  };
};
