import api from './api';
import type {
  Marca,
  CrearMarcaDto,
  ActualizarMarcaDto,
  ApiResponse,
} from '../types';

interface GetAllMarcasParams {
  busqueda?: string;
  skip?: number;
  take?: number;
}

export const marcaService = {
  // GET /api/marcas
  async getAll(params?: GetAllMarcasParams): Promise<{ marcas: Marca[]; total: number }> {
    const response = await api.get<ApiResponse<Marca[]>>('/marcas', { params });
    return {
      marcas: response.data.data,
      total: response.data.total || 0,
    };
  },

  // GET /api/marcas/:id
  async getById(id: string): Promise<Marca> {
    const response = await api.get<ApiResponse<Marca>>(`/marcas/${id}`);
    return response.data.data;
  },

  // POST /api/marcas
  async create(data: CrearMarcaDto): Promise<Marca> {
    const response = await api.post<ApiResponse<Marca>>('/marcas', data);
    return response.data.data;
  },

  // PUT /api/marcas/:id
  async update(id: string, data: ActualizarMarcaDto): Promise<Marca> {
    const response = await api.put<ApiResponse<Marca>>(`/marcas/${id}`, data);
    return response.data.data;
  },

  // DELETE /api/marcas/:id
  async delete(id: string): Promise<void> {
    await api.delete(`/marcas/${id}`);
  },
};
