import api from './api';
import type {
  TipoEquipo,
  CrearTipoEquipoDto,
  ActualizarTipoEquipoDto,
  ApiResponse,
} from '../types';

interface GetAllTiposEquipoParams {
  busqueda?: string;
  activo?: boolean;
  skip?: number;
  take?: number;
}

export const tipoEquipoService = {
  // GET /api/tipos-equipo
  async getAll(params?: GetAllTiposEquipoParams): Promise<{ tiposEquipo: TipoEquipo[]; total: number }> {
    const response = await api.get<ApiResponse<TipoEquipo[]>>('/tipos-equipo', { params });
    return {
      tiposEquipo: response.data.data,
      total: response.data.total || 0,
    };
  },

  // GET /api/tipos-equipo/:id
  async getById(id: string): Promise<TipoEquipo> {
    const response = await api.get<ApiResponse<TipoEquipo>>(`/tipos-equipo/${id}`);
    return response.data.data;
  },

  // POST /api/tipos-equipo
  async create(data: CrearTipoEquipoDto): Promise<TipoEquipo> {
    const response = await api.post<ApiResponse<TipoEquipo>>('/tipos-equipo', data);
    return response.data.data;
  },

  // PUT /api/tipos-equipo/:id
  async update(id: string, data: ActualizarTipoEquipoDto): Promise<TipoEquipo> {
    const response = await api.put<ApiResponse<TipoEquipo>>(`/tipos-equipo/${id}`, data);
    return response.data.data;
  },

  // DELETE /api/tipos-equipo/:id
  async delete(id: string): Promise<void> {
    await api.delete(`/tipos-equipo/${id}`);
  },
};
