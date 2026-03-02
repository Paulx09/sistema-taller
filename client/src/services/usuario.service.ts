import api from './api';
import type { Usuario, ApiResponse } from '@/types';

export const usuarioService = {
  async getAll(): Promise<Usuario[]> {
    const response = await api.get<ApiResponse<Usuario[]>>('/auth/usuarios');
    return response.data.data;
  },
};
