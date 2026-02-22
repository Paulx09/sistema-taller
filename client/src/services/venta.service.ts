import api from './api';
import type { ApiResponse, Venta, CrearVentaDto } from '@/types';

// Listar ventas (con filtros opcionales)
export const listarVentas = async (params?: {
  desde?: string;
  hasta?: string;
  page?: number;
  limit?: number;
}) => {
  const response = await api.get<ApiResponse<Venta[]>>('/ventas', { params });
  return response.data;
};

// Ventas de hoy
export const listarVentasHoy = async () => {
  const response = await api.get<ApiResponse<Venta[]>>('/ventas/hoy');
  return response.data;
};

// Detalle de una venta
export const obtenerVenta = async (id: string) => {
  const response = await api.get<ApiResponse<Venta>>(`/ventas/${id}`);
  return response.data;
};

// Crear una venta (POS)
export const crearVenta = async (data: CrearVentaDto) => {
  const response = await api.post<ApiResponse<Venta> & { mensaje: string }>('/ventas', data);
  return response.data;
};
