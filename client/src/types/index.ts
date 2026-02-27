// Tipos que coinciden con el schema de Prisma

export interface Usuario {
  id: string;
  username: string;
  nombreCompleto: string;
  rol: string;
  createdAt: string;
}

export interface Categoria {
  id: string;
  nombre: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Ubicacion {
  id: string;
  nombre: string;
  descripcion: string | null;
  ubicacionPadreId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Producto {
  id: string;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  sku: string | null;
  codigoBarras: string | null;
  descripcion: string | null;
  categoriaId: string;
  ubicacionId: string | null;
  precioCompra: number; // Decimal from Prisma, converted to number in frontend
  precioVenta: number; // Decimal from Prisma, converted to number in frontend
  stockActual: number;
  stockMinimo: number;
  imagenUrl: string | null;
  specs: Record<string, unknown> | null;
  esServicio: boolean;
  esSegundaMano: boolean;
  
  requiereSerie: boolean;
  garantiaProveedorMeses: number;
  garantiaClienteMeses: number;
  padreId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  categoria?: Categoria;
  ubicacion?: Ubicacion;
  padre?: Producto;
  hijos?: Producto[];
  movimientos?: MovimientoStock[];
  series?: ProductoSerie[];
}

export interface MovimientoStock {
  id: string;
  usuarioId: string | null;
  productoId: string;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'INVENTARIO_INICIAL';
  cantidad: number;
  motivo: string | null;
  createdAt: string;
  usuario?: Usuario;
  producto?: Producto;
}

export interface Venta {
  id: string;
  codigoCorrelativo: number;
  fecha: string;
  usuarioId: string;
  clienteNombre: string | null;
  metodoPago: string | null;
  total: string;
  gananciaTotal: string;
  estado: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  usuario?: Usuario;
  detalles?: DetalleVenta[];
}

export interface DetalleVenta {
  id: string;
  ventaId: string;
  productoId: string;
  cantidad: number;
  precioUnitario: string;
  costoUnitarioSnapshot: string;
  subtotal: string;
  createdAt: string;
  producto?: Producto;
}

// DTOs para request/response del API

export interface CrearUbicacionDto {
  nombre: string;
  descripcion?: string;
}

export interface ActualizarUbicacionDto {
  nombre?: string;
  descripcion?: string;
}

export interface CrearCategoriaDto {
  nombre: string;
}

export interface ActualizarCategoriaDto {
  nombre: string;
}

export interface CrearProductoDto {
  nombre: string;
  marca?: string;
  modelo?: string;
  sku?: string;
  codigoBarras?: string;
  descripcion?: string;
  categoriaId: string;
  ubicacionId?: string;
  precioCompra: number;
  precioVenta: number;
  stockActual?: number;
  stockMinimo?: number;
  imagenUrl?: string;
  specs?: Record<string, unknown>;
  esServicio?: boolean;
  esSegundaMano?: boolean;
  requiereSerie?: boolean;
  garantiaProveedorMeses?: number;
  garantiaClienteMeses?: number;
  padreId?: string;
}

export interface ActualizarProductoDto {
  nombre?: string;
  marca?: string;
  modelo?: string;
  sku?: string;
  codigoBarras?: string;
  descripcion?: string;
  categoriaId?: string;
  ubicacionId?: string;
  precioCompra?: number;
  precioVenta?: number;
  stockMinimo?: number;
  imagenUrl?: string;
  specs?: Record<string, unknown>;
  esServicio?: boolean;
  esSegundaMano?: boolean;
  requiereSerie?: boolean;
  garantiaProveedorMeses?: number;
  garantiaClienteMeses?: number;
  padreId?: string;
}

export interface AjustarStockDto {
  cantidad: number;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  motivo: string;
  numerosSerie?: string[];
}

// Response genérico del API
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  mensaje?: string;
  error?: string;
  total?: number;
}

export interface ApiError {
  error: string;
  mensaje?: string;
  details?: Array<{
    campo: string;
    mensaje: string;
  }>;
}

// Ventas DTOs
export interface CrearDetalleVentaDto {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  numerosSerie?: string[]; // Para productos que requieren serie
}

export interface CrearVentaDto {
  clienteNombre?: string;
  metodoPago: 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN';
  detalles: CrearDetalleVentaDto[];
}

export interface Proveedor {
  id: string;
  nombreEmpresa: string;
  ruc: string | null;
  contactoNombre: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  compras?: Compra[];
  _count?: {
    compras: number;
  };
}

export interface Compra {
  id: string;
  proveedorId: string;
  usuarioId: string;
  numeroFactura: string;
  fechaCompra: string;
  totalCompra: string;
  createdAt: string;
  deletedAt: string | null;
  proveedor?: {
    id: string;
    nombreEmpresa: string;
    ruc: string | null;
    contactoNombre?: string | null;
    telefono?: string | null;
  };
  usuario?: {
    id: string;
    username: string;
    nombreCompleto: string;
  };
  detalles?: DetalleCompra[];
  movimientos?: MovimientoStock[];
  _count?: {
    detalles: number;
  };
}

export interface DetalleCompra {
  id: string;
  compraId: string;
  productoId: string;
  cantidad: number;
  costoUnitario: string;
  subtotal: string;
  producto?: {
    id: string;
    nombre: string;
    marca: string | null;
    modelo: string | null;
    sku: string | null;
    esServicio: boolean;
    categoria?: { nombre: string };
  };
}

export interface HistorialCosto {
  id: string;
  productoId: string;
  costo: string;
  fechaRegistro: string;
  producto?: Producto;
}

// Proveedores DTOs
export interface CrearProveedorDto {
  nombreEmpresa: string;
  ruc?: string;
  contactoNombre?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
}

export interface ActualizarProveedorDto {
  nombreEmpresa?: string;
  ruc?: string;
  contactoNombre?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
}

// Compras DTOs
export interface CrearDetalleCompraDto {
  productoId: string;
  cantidad: number;
  costoUnitario: number;
  numerosSerie?: string[]; // Números de serie para productos que lo requieran
}

export interface CrearCompraDto {
  proveedorId: string;
  numeroFactura: string;
  fechaCompra?: string;
  detalles: CrearDetalleCompraDto[];
  totalCompra?: number; // Para validación de cuadre
}

// NÚMEROS DE SERIE Y GARANTÍAS

export type EstadoSerie = 'DISPONIBLE' | 'VENDIDO' | 'GARANTIA' | 'DEVUELTO';

export interface ProductoSerie {
  id: string;
  productoId: string;
  numeroSerie: string;
  estado: EstadoSerie;
  compraId: string | null;
  ventaId: string | null;
  createdAt: string;
  updatedAt: string;
  producto?: Producto;
  compra?: Compra;
  venta?: Venta;
}

export interface VerificarGarantiaResponse {
  encontrado: boolean;
  mensaje?: string;
  numeroSerie?: string;
  estado?: EstadoSerie;
  producto?: {
    nombre: string;
    marca: string | null;
    modelo: string | null;
    garantiaClienteMeses: number;
    garantiaProveedorMeses: number;
  };
  garantiaCliente?: {
    vigente: boolean;
    mesesGarantia: number;
    fechaVenta: string;
    fechaVencimiento: string;
    diasRestantes: number;
    clienteNombre: string;
  } | null;
  garantiaProveedor?: {
    vigente: boolean;
    mesesGarantia: number;
    fechaCompra: string;
    fechaVencimiento: string;
    diasRestantes: number;
    proveedorNombre: string;
  } | null;
}

export interface SerieEstadisticas {
  DISPONIBLE: number;
  VENDIDO: number;
  GARANTIA: number;
  DEVUELTO: number;
}
