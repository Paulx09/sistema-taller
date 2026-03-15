import api from './api';
import type { Compra, CrearCompraDto, ApiResponse, SugerenciaPrecio } from '@/types';

interface ListarComprasParams {
  proveedorId?: string;
  desde?: string;
  hasta?: string;
  page?: number;
  limit?: number;
}

interface CrearCompraResponse {
  compra: Compra;
  sugerenciasPrecio: SugerenciaPrecio[];
}

export const listarCompras = async (params?: ListarComprasParams) => {
  const response = await api.get<ApiResponse<Compra[]>>('/compras', { params });
  return response.data;
};

export const obtenerCompra = async (id: string) => {
  const response = await api.get<ApiResponse<Compra>>(`/compras/${id}`);
  return response.data;
};

export const crearCompra = async (data: CrearCompraDto): Promise<CrearCompraResponse> => {
  const response = await api.post<ApiResponse<CrearCompraResponse>>('/compras', data);
  return response.data.data;
};

export const anularCompra = async (id: string) => {
  const response = await api.delete<ApiResponse<{ mensaje: string }>>(`/compras/${id}`);
  return response.data;
};
