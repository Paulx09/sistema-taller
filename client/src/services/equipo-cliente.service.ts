import api from './api';
import type { EquipoCliente, CrearEquipoDto, ActualizarEquipoDto, ApiResponse } from '../types';

export const equipoClienteService = {
  // GET /api/clientes/:clienteId/equipos
  async getByCliente(clienteId: string): Promise<EquipoCliente[]> {
    const response = await api.get<ApiResponse<EquipoCliente[]>>(`/clientes/${clienteId}/equipos`);
    return response.data.data;
  },

  // GET /api/equipos/:id
  async getById(id: string): Promise<EquipoCliente> {
    const response = await api.get<ApiResponse<EquipoCliente>>(`/equipos/${id}`);
    return response.data.data;
  },

  // GET /api/equipos/:id/contrasena — revela contraseña/patrón
  async revelarContrasena(id: string): Promise<{ contrasenaPatron: string | null }> {
    const response = await api.get<ApiResponse<{ contrasenaPatron: string | null }>>(`/equipos/${id}/contrasena`);
    return response.data.data;
  },

  // POST /api/clientes/:clienteId/equipos
  async create(clienteId: string, data: CrearEquipoDto): Promise<EquipoCliente> {
    const response = await api.post<ApiResponse<EquipoCliente>>(`/clientes/${clienteId}/equipos`, data);
    return response.data.data;
  },

  // PUT /api/equipos/:id
  async update(id: string, data: ActualizarEquipoDto): Promise<EquipoCliente> {
    const response = await api.put<ApiResponse<EquipoCliente>>(`/equipos/${id}`, data);
    return response.data.data;
  },

  // DELETE /api/equipos/:id
  async delete(id: string): Promise<void> {
    await api.delete(`/equipos/${id}`);
  },
};
