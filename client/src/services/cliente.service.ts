import api from './api';
import type { Cliente, CrearClienteDto, ActualizarClienteDto, ApiResponse } from '../types';

interface GetClientesParams {
  busqueda?: string;
  page?: number;
  limit?: number;
}

export const clienteService = {
  // GET /api/clientes
  async getAll(params?: GetClientesParams): Promise<{ clientes: Cliente[]; total: number }> {
    const response = await api.get<ApiResponse<Cliente[]>>('/clientes', { params });
    return {
      clientes: response.data.data,
      total: response.data.total || 0,
    };
  },

  // GET /api/clientes/:id
  async getById(id: string): Promise<Cliente> {
    const response = await api.get<ApiResponse<Cliente>>(`/clientes/${id}`);
    return response.data.data;
  },

  // POST /api/clientes
  async create(data: CrearClienteDto): Promise<Cliente> {
    const response = await api.post<ApiResponse<Cliente>>('/clientes', data);
    return response.data.data;
  },

  // PUT /api/clientes/:id
  async update(id: string, data: ActualizarClienteDto): Promise<Cliente> {
    const response = await api.put<ApiResponse<Cliente>>(`/clientes/${id}`, data);
    return response.data.data;
  },

  // DELETE /api/clientes/:id
  async delete(id: string): Promise<void> {
    await api.delete(`/clientes/${id}`);
  },
};
