import api from './api';
import type {
  Usuario,
  UsuarioAdmin,
  CrearUsuarioAdminDto,
  ActualizarUsuarioAdminDto,
  RolGestionable,
  ApiResponse,
} from '@/types';

export type {
  UsuarioAdmin,
  CrearUsuarioAdminDto,
  ActualizarUsuarioAdminDto,
  RolGestionable,
};

export const usuarioService = {
  async getAll(): Promise<Usuario[]> {
    const response = await api.get<ApiResponse<Usuario[]>>('/auth/usuarios');
    return response.data.data;
  },

  async listarAdmin(): Promise<UsuarioAdmin[]> {
    const response = await api.get<ApiResponse<UsuarioAdmin[]>>('/usuarios');
    return response.data.data;
  },

  async crearAdmin(data: CrearUsuarioAdminDto): Promise<UsuarioAdmin> {
    const response = await api.post<ApiResponse<UsuarioAdmin>>('/usuarios', data);
    return response.data.data;
  },

  async actualizarAdmin(
    id: string,
    data: ActualizarUsuarioAdminDto
  ): Promise<UsuarioAdmin> {
    const response = await api.patch<ApiResponse<UsuarioAdmin>>(`/usuarios/${id}`, data);
    return response.data.data;
  },

  async cambiarPasswordAdmin(id: string, newPassword: string): Promise<string> {
    const response = await api.patch<ApiResponse<null>>(`/usuarios/${id}/password`, {
      newPassword,
    });
    return response.data.mensaje ?? 'Contraseña actualizada correctamente';
  },
};
