import api from './api';
import type {
  OrdenServicio,
  OrdenServicioResumen,
  EquipoOrden,
  CrearOrdenDto,
  ActualizarOrdenDto,
  EquipoOrdenInputDto,
  ActualizarEquipoOrdenDto,
  CambiarEstadoEquipoDto,
  AgregarItemOrdenDto,
  EstadoOrden,
  NotaTecnica,
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

  // PUT /api/ordenes-servicio/:id  (solo usuarioTecnicoId + pagoACuenta)
  async update(id: string, data: ActualizarOrdenDto): Promise<OrdenServicio> {
    const response = await api.put<ApiResponse<OrdenServicio>>(`/ordenes-servicio/${id}`, data);
    return response.data.data;
  },

  // DELETE /api/ordenes-servicio/:id
  async delete(id: string): Promise<void> {
    await api.delete(`/ordenes-servicio/${id}`);
  },

  // PATCH /api/ordenes-servicio/:id/estado  (solo ENTREGADA)
  async cambiarEstado(id: string, nuevoEstado: EstadoOrden): Promise<OrdenServicio> {
    const response = await api.patch<ApiResponse<OrdenServicio>>(
      `/ordenes-servicio/${id}/estado`,
      { estado: nuevoEstado }
    );
    return response.data.data;
  },

  // Equipos

  // POST /api/ordenes-servicio/:id/equipos
  async agregarEquipo(id: string, data: EquipoOrdenInputDto): Promise<OrdenServicio> {
    const response = await api.post<ApiResponse<OrdenServicio>>(
      `/ordenes-servicio/${id}/equipos`,
      data
    );
    return response.data.data;
  },

  // PUT /api/ordenes-servicio/:id/equipos/:equipoOrdenId
  async actualizarEquipo(id: string, equipoOrdenId: string, data: ActualizarEquipoOrdenDto): Promise<OrdenServicio> {
    const response = await api.put<ApiResponse<OrdenServicio>>(
      `/ordenes-servicio/${id}/equipos/${equipoOrdenId}`,
      data
    );
    return response.data.data;
  },

  // DELETE /api/ordenes-servicio/:id/equipos/:equipoOrdenId
  async quitarEquipo(id: string, equipoOrdenId: string): Promise<OrdenServicio> {
    const response = await api.delete<ApiResponse<OrdenServicio>>(
      `/ordenes-servicio/${id}/equipos/${equipoOrdenId}`
    );
    return response.data.data;
  },

  // PATCH /api/ordenes-servicio/:id/equipos/:equipoOrdenId/estado
  async cambiarEstadoEquipo(id: string, equipoOrdenId: string, data: CambiarEstadoEquipoDto): Promise<OrdenServicio> {
    const response = await api.patch<ApiResponse<OrdenServicio>>(
      `/ordenes-servicio/${id}/equipos/${equipoOrdenId}/estado`,
      data
    );
    return response.data.data;
  },

  // Items

  // POST /api/ordenes-servicio/:id/equipos/:equipoOrdenId/items
  async agregarItem(id: string, equipoOrdenId: string, data: AgregarItemOrdenDto): Promise<OrdenServicio> {
    const response = await api.post<ApiResponse<OrdenServicio>>(
      `/ordenes-servicio/${id}/equipos/${equipoOrdenId}/items`,
      data
    );
    return response.data.data;
  },

  // DELETE /api/ordenes-servicio/:id/items/:itemId
  async quitarItem(id: string, itemId: string): Promise<OrdenServicio> {
    const response = await api.delete<ApiResponse<OrdenServicio>>(
      `/ordenes-servicio/${id}/items/${itemId}`
    );
    return response.data.data;
  },

  // Notas técnicas

  // GET /api/ordenes-servicio/:ordenId/equipos/:equipoOrdenId/notas
  async getNotas(ordenId: string, equipoOrdenId: string): Promise<NotaTecnica[]> {
    const response = await api.get<ApiResponse<NotaTecnica[]>>(
      `/ordenes-servicio/${ordenId}/equipos/${equipoOrdenId}/notas`
    );
    return response.data.data;
  },

  // POST /api/ordenes-servicio/:ordenId/equipos/:equipoOrdenId/notas
  async crearNota(ordenId: string, equipoOrdenId: string, contenido: string): Promise<NotaTecnica> {
    const response = await api.post<ApiResponse<NotaTecnica>>(
      `/ordenes-servicio/${ordenId}/equipos/${equipoOrdenId}/notas`,
      { contenido }
    );
    return response.data.data;
  },
};

// Re-exportar EquipoOrden para conveniencia de los consumidores
export type { EquipoOrden };
