import api from './api';
import type {
  Categoria,
  CrearCategoriaDto,
  ActualizarCategoriaDto,
  ApiResponse,
} from '../types';

interface GetAllCategoriasParams {
  skip?: number;
  take?: number;
}

export const categoriaService = {
  // GET /api/categorias
  async getAll(params?: GetAllCategoriasParams): Promise<{ categorias: Categoria[]; total: number }> {
    const response = await api.get<ApiResponse<Categoria[]>>('/categorias', { params });
    return {
      categorias: response.data.data,
      total: response.data.total || 0
    };
  },

  // GET /api/categorias/:id
  async getById(id: string): Promise<Categoria> {
    const response = await api.get<ApiResponse<Categoria>>(`/categorias/${id}`);
    return response.data.data;
  },

  // POST /api/categorias
  async create(data: CrearCategoriaDto): Promise<Categoria> {
    const response = await api.post<ApiResponse<Categoria>>('/categorias', data);
    return response.data.data;
  },

  // PUT /api/categorias/:id
  async update(id: string, data: ActualizarCategoriaDto): Promise<Categoria> {
    const response = await api.put<ApiResponse<Categoria>>(`/categorias/${id}`, data);
    return response.data.data;
  },

  // DELETE /api/categorias/:id
  async delete(id: string): Promise<void> {
    await api.delete(`/categorias/${id}`);
  },
};
