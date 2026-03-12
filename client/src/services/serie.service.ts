import api from './api';
import type {
  ProductoSerie,
  VerificarGarantiaResponse,
  SerieEstadisticas,
  EstadoSerie,
  ApiResponse,
} from '../types';

export const serieService = {
  /**
   * Verificar si un número de serie está disponible
   */
  async verificarDisponibilidad(numeroSerie: string): Promise<boolean> {
    const response = await api.get<ApiResponse<{ numeroSerie: string; disponible: boolean }>>(
      `/series/verificar/${encodeURIComponent(numeroSerie)}`
    );
    return response.data.data.disponible;
  },

  /**
   * Buscar información completa de una serie
   */
  async buscarPorNumeroSerie(numeroSerie: string): Promise<ProductoSerie | null> {
    try {
      const response = await api.get<ApiResponse<ProductoSerie>>(
        `/series/buscar/${encodeURIComponent(numeroSerie)}`
      );
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Obtener todas las series de un producto
   */
  async obtenerSeriesPorProducto(
    productoId: string,
    estado?: EstadoSerie
  ): Promise<ProductoSerie[]> {
    const response = await api.get<ApiResponse<ProductoSerie[]>>(
      `/series/producto/${productoId}`,
      {
        params: { estado },
      }
    );
    return response.data.data;
  },

  /**
   * Obtener solo series disponibles de un producto
   */
  async obtenerSeriesDisponibles(productoId: string): Promise<ProductoSerie[]> {
    const response = await api.get<ApiResponse<ProductoSerie[]>>(
      `/series/producto/${productoId}/disponibles`
    );
    return response.data.data;
  },

  /**
   * Obtener estadísticas de series por estado
   */
  async obtenerEstadisticas(productoId: string): Promise<SerieEstadisticas> {
    const response = await api.get<ApiResponse<SerieEstadisticas>>(
      `/series/producto/${productoId}/estadisticas`
    );
    return response.data.data;
  },

  /**
   * Verificar garantía de un producto
   */
  async verificarGarantia(numeroSerie: string): Promise<VerificarGarantiaResponse> {
    const response = await api.get<ApiResponse<VerificarGarantiaResponse>>(
      `/series/garantia/${encodeURIComponent(numeroSerie)}`
    );
    return response.data.data;
  },

  /**
   * Cambiar estado de una serie
   */
  async cambiarEstado(numeroSerie: string, nuevoEstado: EstadoSerie): Promise<ProductoSerie> {
    const response = await api.patch<ApiResponse<ProductoSerie>>(
      `/series/${encodeURIComponent(numeroSerie)}/estado`,
      { estado: nuevoEstado }
    );
    return response.data.data;
  },
};

// Exportar función verificarGarantia como named export
export const verificarGarantia = serieService.verificarGarantia.bind(serieService);
