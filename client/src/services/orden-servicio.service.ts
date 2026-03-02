import api from './api';
import type {
  OrdenServicio,
  OrdenServicioResumen,
  CrearOrdenDto,
  ActualizarOrdenDto,
  AgregarItemOrdenDto,
  EstadoOrden,
  NotaTecnica,
  ItemOrden,
  ApiResponse,
} from '@/types';

export interface GetOrdenesParams {
  estado?: EstadoOrden | '';
  clienteId?: string;
  usuarioTecnicoId?: string;
  desde?: string;
  hasta?: string;
  busqueda?: string;
  page?: number;
  limit?: number;
}

export const ordenServicioService = {
  // GET /api/ordenes-servicio
  async getAll(params?: GetOrdenesParams): Promise<{ ordenes: OrdenServicioResumen[]; total: number }> {
    // Limpiar params vacíos
    const cleanParams = Object.fromEntries(
      Object.entries(params || {}).filter(([, v]) => v !== '' && v !== undefined && v !== null)
    );
    const response = await api.get<ApiResponse<OrdenServicioResumen[]>>('/ordenes-servicio', {
      params: cleanParams,
    });
    return {
      ordenes: response.data.data,
      total: response.data.total || 0,
    };
  },

  // GET /api/ordenes-servicio/:id
  async getById(id: string): Promise<OrdenServicio> {
    const response = await api.get<ApiResponse<OrdenServicio>>(`/ordenes-servicio/${id}`);
    return response.data.data;
  },

  // POST /api/ordenes-servicio
  async create(data: CrearOrdenDto): Promise<OrdenServicio> {
    const response = await api.post<ApiResponse<OrdenServicio>>('/ordenes-servicio', data);
    return response.data.data;
  },

  // PUT /api/ordenes-servicio/:id
  async update(id: string, data: ActualizarOrdenDto): Promise<OrdenServicio> {
    const response = await api.put<ApiResponse<OrdenServicio>>(`/ordenes-servicio/${id}`, data);
    return response.data.data;
  },

  // DELETE /api/ordenes-servicio/:id (solo RECIBIDA o CANCELADA)
  async delete(id: string): Promise<void> {
    await api.delete(`/ordenes-servicio/${id}`);
  },

  // PATCH /api/ordenes-servicio/:id/estado
  async cambiarEstado(id: string, nuevoEstado: EstadoOrden): Promise<OrdenServicio> {
    const response = await api.patch<ApiResponse<OrdenServicio>>(
      `/ordenes-servicio/${id}/estado`,
      { estado: nuevoEstado }
    );
    return response.data.data;
  },

  // POST /api/ordenes-servicio/:id/items
  async agregarItem(id: string, data: AgregarItemOrdenDto): Promise<ItemOrden> {
    const response = await api.post<ApiResponse<ItemOrden>>(
      `/ordenes-servicio/${id}/items`,
      data
    );
    return response.data.data;
  },

  // DELETE /api/ordenes-servicio/:id/items/:itemId
  async quitarItem(id: string, itemId: string): Promise<void> {
    await api.delete(`/ordenes-servicio/${id}/items/${itemId}`);
  },

  // GET /api/ordenes-servicio/:ordenId/notas
  async getNotas(ordenId: string): Promise<NotaTecnica[]> {
    const response = await api.get<ApiResponse<NotaTecnica[]>>(
      `/ordenes-servicio/${ordenId}/notas`
    );
    return response.data.data;
  },

  // POST /api/ordenes-servicio/:ordenId/notas
  async crearNota(ordenId: string, contenido: string): Promise<NotaTecnica> {
    const response = await api.post<ApiResponse<NotaTecnica>>(
      `/ordenes-servicio/${ordenId}/notas`,
      { contenido }
    );
    return response.data.data;
  },
};
