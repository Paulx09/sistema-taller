import api from './api';
import type {
  Ubicacion,
  CrearUbicacionDto,
  ActualizarUbicacionDto,
  ApiResponse,
} from '../types';

interface GetAllUbicacionesParams {
  skip?: number;
  take?: number;
}

export const ubicacionService = {
  // GET /api/ubicaciones
  async getAll(params?: GetAllUbicacionesParams): Promise<{ ubicaciones: Ubicacion[]; total: number }> {
    const response = await api.get<ApiResponse<Ubicacion[]>>('/ubicaciones', { params });
    return {
      ubicaciones: response.data.data,
      total: response.data.total || 0
    };
  },

  // GET /api/ubicaciones/:id
  async getById(id: string): Promise<Ubicacion> {
    const response = await api.get<ApiResponse<Ubicacion>>(`/ubicaciones/${id}`);
    return response.data.data;
  },

  // POST /api/ubicaciones
  async create(data: CrearUbicacionDto): Promise<Ubicacion> {
    const response = await api.post<ApiResponse<Ubicacion>>('/ubicaciones', data);
    return response.data.data;
  },

  // PUT /api/ubicaciones/:id
  async update(id: string, data: ActualizarUbicacionDto): Promise<Ubicacion> {
    const response = await api.put<ApiResponse<Ubicacion>>(`/ubicaciones/${id}`, data);
    return response.data.data;
  },

  // DELETE /api/ubicaciones/:id
  async delete(id: string): Promise<void> {
    await api.delete(`/ubicaciones/${id}`);
  },
};
