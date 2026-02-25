import api from './api';
import type { Proveedor, CrearProveedorDto, ActualizarProveedorDto, ApiResponse } from '@/types';

interface ListarProveedoresParams {
  busqueda?: string;
  page?: number;
  limit?: number;
}

export const listarProveedores = async (params?: ListarProveedoresParams) => {
  const response = await api.get<ApiResponse<Proveedor[]>>('/proveedores', { params });
  return response.data;
};

export const obtenerProveedor = async (id: string) => {
  const response = await api.get<ApiResponse<Proveedor>>(`/proveedores/${id}`);
  return response.data;
};

export const crearProveedor = async (data: CrearProveedorDto) => {
  const response = await api.post<ApiResponse<Proveedor>>('/proveedores', data);
  return response.data;
};

export const actualizarProveedor = async (id: string, data: ActualizarProveedorDto) => {
  const response = await api.put<ApiResponse<Proveedor>>(`/proveedores/${id}`, data);
  return response.data;
};

export const eliminarProveedor = async (id: string) => {
  const response = await api.delete<ApiResponse<void>>(`/proveedores/${id}`);
  return response.data;
};
