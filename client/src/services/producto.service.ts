import api from './api';
import type {
  Producto,
  CrearProductoDto,
  ActualizarProductoDto,
  AjustarStockDto,
  ApiResponse,
} from '../types';

interface ProductoBusqueda {
  id: string;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  stockActual: number;
  esServicio: boolean;
  precioVenta: number | string;
}

// Tipo para el producto que viene del backend con precios como string (Decimal de Prisma)
type ProductoRaw = Omit<Producto, 'precioCompra' | 'precioVenta' | 'padre' | 'hijos'> & {
  precioCompra: string | number;
  precioVenta: string | number;
  padre?: ProductoRaw;
  hijos?: ProductoRaw[];
};

// Helper para convertir Decimales de Prisma (strings) a números
const transformProducto = (producto: ProductoRaw): Producto => ({
  ...producto,
  precioCompra: typeof producto.precioCompra === 'string' 
    ? Number.parseFloat(producto.precioCompra) 
    : producto.precioCompra,
  precioVenta: typeof producto.precioVenta === 'string' 
    ? Number.parseFloat(producto.precioVenta) 
    : producto.precioVenta,
  categoria: producto.categoria,
  ubicacion: producto.ubicacion,
  padre: producto.padre ? transformProducto(producto.padre) : undefined,
  hijos: producto.hijos?.map(transformProducto),
  movimientos: producto.movimientos,
  historialCostos: producto.historialCostos, // Mantener historialCostos (costo ya viene como string desde Prisma)
});

export const productoService = {
  // GET /api/productos
  async getAll(params?: {
    busqueda?: string;
    categoriaId?: string;
    marcaId?: string;
    esServicio?: boolean;
    bajoStock?: boolean;
    preciosPendientes?: boolean;
    skip?: number;
    take?: number;
  }): Promise<{ productos: Producto[]; total: number }> {
    const response = await api.get<ApiResponse<ProductoRaw[]> & { total: number }>('/productos', {
      params,
    });
    return {
      productos: response.data.data.map(transformProducto),
      total: response.data.total || 0,
    };
  },

  // GET /api/productos/:id
  async getById(id: string): Promise<Producto> {
    const response = await api.get<ApiResponse<ProductoRaw>>(`/productos/${id}`);
    return transformProducto(response.data.data);
  },

  // GET /api/productos/buscar?q=...&excludeId=...&incluirServicios=...
  async buscarParaCombobox(query: string, excludeId?: string, incluirServicios = false): Promise<ProductoBusqueda[]> {
    const response = await api.get<ApiResponse<ProductoBusqueda[]>>('/productos/buscar', {
      params: { q: query, excludeId, incluirServicios: incluirServicios || undefined },
    });
    return response.data.data;
  },

  // GET /api/productos/bajo-stock
  async getBajoStock(): Promise<Producto[]> {
    const response = await api.get<ApiResponse<ProductoRaw[]>>('/productos/bajo-stock');
    return response.data.data.map(transformProducto);
  },

  // GET /api/productos/sin-movimiento?dias=90
  async getSinMovimiento(dias?: number): Promise<Producto[]> {
    const response = await api.get<ApiResponse<ProductoRaw[]>>('/productos/sin-movimiento', {
      params: { dias },
    });
    return response.data.data.map(transformProducto);
  },

  // POST /api/productos
  async create(data: CrearProductoDto | FormData): Promise<Producto> {
    const config = data instanceof FormData ? {
      headers: { 'Content-Type': 'multipart/form-data' }
    } : {};
    
    const response = await api.post<ApiResponse<ProductoRaw>>('/productos', data, config);
    return transformProducto(response.data.data);
  },

  // POST /api/productos/rapido (Crear Producto Rápido desde Compras)
  async createRapido(data: CrearProductoDto): Promise<Producto> {
    const response = await api.post<ApiResponse<ProductoRaw>>('/productos/rapido', data);
    return transformProducto(response.data.data);
  },

  // PUT /api/productos/:id
  async update(id: string, data: ActualizarProductoDto | FormData): Promise<Producto> {
    const config = data instanceof FormData ? {
      headers: { 'Content-Type': 'multipart/form-data' }
    } : {};
    
    const response = await api.put<ApiResponse<ProductoRaw>>(`/productos/${id}`, data, config);
    return transformProducto(response.data.data);
  },

  // PATCH /api/productos/:id/stock
  async ajustarStock(id: string, data: AjustarStockDto): Promise<Producto> {
    const response = await api.patch<ApiResponse<ProductoRaw>>(`/productos/${id}/stock`, data);
    return transformProducto(response.data.data);
  },

  // PUT /api/productos/actualizar-precios-masivo
  async actualizarPreciosMasivo(actualizaciones: Array<{ id: string; precioVenta: number }>): Promise<void> {
    await api.put('/productos/actualizar-precios-masivo', actualizaciones);
  },

  // DELETE /api/productos/:id
  async delete(id: string, force: boolean = false): Promise<void> {
    await api.delete(`/productos/${id}`, {
      params: { force: force.toString() },
    });
  },

  // PUT /api/productos/:id/restaurar
  async restaurar(id: string): Promise<Producto> {
    const response = await api.put<ApiResponse<ProductoRaw>>(`/productos/${id}/restaurar`);
    return transformProducto(response.data.data);
  },
};
