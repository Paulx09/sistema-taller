import { useState, useEffect, useCallback } from 'react';
import { clienteService } from '../services/cliente.service';
import { getErrorMessage } from '../lib/utils';
import type { Cliente, CrearClienteDto, ActualizarClienteDto } from '../types';

interface UseClientesParams {
  busqueda?: string;
  limit?: number;
}

export const useClientes = (params?: UseClientesParams) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { busqueda, limit } = params || {};

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { clientes: data, total: totalCount } = await clienteService.getAll({
        busqueda: busqueda || undefined,
        limit: limit || 100,
      });
      setClientes(data);
      setTotal(totalCount);
    } catch (err) {
      setError(getErrorMessage(err, 'Error al cargar clientes'));
    } finally {
      setLoading(false);
    }
  }, [busqueda, limit]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  const createCliente = async (data: CrearClienteDto): Promise<Cliente> => {
    try {
      const nuevo = await clienteService.create(data);
      await fetchClientes();
      return nuevo;
    } catch (err) {
      const msg = getErrorMessage(err, 'Error al crear cliente');
      setError(msg);
      throw err;
    }
  };

  const updateCliente = async (id: string, data: ActualizarClienteDto): Promise<Cliente> => {
    try {
      const actualizado = await clienteService.update(id, data);
      setClientes((prev) => prev.map((c) => (c.id === id ? { ...c, ...actualizado } : c)));
      return actualizado;
    } catch (err) {
      const msg = getErrorMessage(err, 'Error al actualizar cliente');
      setError(msg);
      throw err;
    }
  };

  const deleteCliente = async (id: string): Promise<void> => {
    try {
      await clienteService.delete(id);
      setClientes((prev) => prev.filter((c) => c.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      const msg = getErrorMessage(err, 'Error al eliminar cliente');
      setError(msg);
      throw err;
    }
  };

  return {
    clientes,
    total,
    loading,
    error,
    refetch: fetchClientes,
    createCliente,
    updateCliente,
    deleteCliente,
  };
};
