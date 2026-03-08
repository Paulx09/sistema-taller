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
  precioCompra: number; // Decimal from Prisma, converted to number in frontend (CPP - Costo Promedio Ponderado)
  precioVenta: number; // Decimal from Prisma, converted to number in frontend
  margenReferencia: number | null; // Decimal from Prisma, converted to number in frontend
  ultimoCostoCompra?: number; // Último costo registrado (para referencia en compras)
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
  historialCostos?: HistorialCosto[];
}

export interface HistorialCosto {
  id: string;
  productoId: string;
  costo: string; // Decimal from Prisma
  fechaRegistro: string;
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

export interface SugerenciaPrecio {
  productoId: string;
  productoNombre: string;
  cppAnterior: number;
  cppNuevo: number;
  margenReferencia: number | null;
  precioActual: number;
  precioSugerido: number;
  precioEditado?: number; // Para edición en UI
  margenResultante?: number; // Calculado en UI
  aplicar?: boolean; // Checkbox en UI
  variacionCPP: number;
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

// FASE 3: CLIENTES, EQUIPOS Y ÓRDENES DE SERVICIO 

export interface Cliente {
  id: string;
  nombre: string;
  dniRuc: string | null;
  telefono: string | null;
  direccion: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  equipos?: EquipoCliente[];
  ordenes?: OrdenServicioResumen[];
  ventas?: VentaResumen[];
  _count?: {
    equipos: number;
    ordenes: number;
    ventas: number;
  };
}

export interface EquipoCliente {
  id: string;
  clienteId: string;
  tipoEquipo: string;
  marca: string | null;
  modelo: string | null;
  numeroSerie: string | null;
  // contrasenaPatron: nunca se incluye en el tipo general (se revela por endpoint específico)
  createdAt: string;
  updatedAt: string;
  cliente?: { id: string; nombre: string };
  _count?: { equiposOrdenes: number };
}

export type EstadoOrden = 'RECIBIDA' | 'EN_REPARACION' | 'LISTA' | 'ENTREGADA' | 'CANCELADA';
export type EstadoEquipoOrden = 'RECIBIDA' | 'EN_REPARACION' | 'LISTA' | 'CANCELADA';

export interface EquipoOrden {
  id: string;
  ordenId: string;
  equipoId: string;
  problemaReportado: string;
  diagnosticoTecnico: string | null;
  observacionesEsteticas: Record<string, any> | null;
  costoEstimado: string | null;
  subtotal: string;
  ganancia: string;
  estado: EstadoEquipoOrden;
  createdAt: string;
  updatedAt: string;
  equipo?: { id: string; tipoEquipo: string; marca: string | null; modelo: string | null; numeroSerie: string | null };
  items?: ItemOrden[];
  notas?: NotaTecnica[];
}

export interface OrdenServicio {
  id: string;
  codigoCorrelativo: number;
  codigoFormateado: string;
  clienteId: string;
  usuarioRegistroId: string;
  usuarioTecnicoId: string | null;
  fechaEmision: string;
  pagoACuenta: string;
  total: string;
  gananciaTotal: string;
  estado: EstadoOrden;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  cliente?: { id: string; nombre: string; telefono: string | null; dniRuc: string | null };
  equipos?: EquipoOrden[];
  usuarioRegistro?: { id: string; username: string; nombreCompleto: string };
  usuarioTecnico?: { id: string; username: string; nombreCompleto: string } | null;
  _count?: { equipos: number };
}

/** Versión resumida para listados */
export interface OrdenServicioResumen {
  id: string;
  codigoCorrelativo: number;
  codigoFormateado: string;
  estado: EstadoOrden;
  fechaEmision: string;
  total: string;
  pagoACuenta: string;
  cliente: { id: string; nombre: string; telefono: string | null };
  equipos: { equipo: { tipoEquipo: string; marca: string | null; modelo: string | null } }[];
  usuarioRegistro: { id: string; nombreCompleto: string };
  usuarioTecnico: { id: string; nombreCompleto: string } | null;
  _count: { equipos: number };
}

export interface VentaResumen {
  id: string;
  codigoCorrelativo: number;
  fecha: string;
  total: string;
  estado: string;
}

export interface ItemOrden {
  id: string;
  equipoOrdenId: string;
  productoId: string;
  cantidad: number;
  precioUnitario: string;
  costoUnitarioSnapshot: string;
  subtotal: string;
  createdAt: string;
  producto?: {
    id: string;
    nombre: string;
    marca: string | null;
    modelo: string | null;
    sku: string | null;
    esServicio: boolean;
    imagenUrl: string | null;
    stockActual: number;
  };
}

export interface NotaTecnica {
  id: string;
  equipoOrdenId: string;
  usuarioId: string;
  contenido: string;
  createdAt: string;
  usuario?: { id: string; username: string; nombreCompleto: string };
}

// DTOs Clientes
export interface CrearClienteDto {
  nombre: string;
  dniRuc?: string | null;
  telefono?: string | null;
  direccion?: string | null;
}

export interface ActualizarClienteDto {
  nombre?: string;
  dniRuc?: string | null;
  telefono?: string | null;
  direccion?: string | null;
}

// DTOs Equipos
export interface CrearEquipoDto {
  tipoEquipo: string;
  marca?: string | null;
  modelo?: string | null;
  numeroSerie?: string | null;
  contrasenaPatron?: string | null;
}

export interface ActualizarEquipoDto {
  tipoEquipo?: string;
  marca?: string | null;
  modelo?: string | null;
  numeroSerie?: string | null;
  contrasenaPatron?: string | null;
}

// DTOs Órdenes de Servicio
export interface EquipoOrdenInputDto {
  equipoId: string;
  problemaReportado: string;
  diagnosticoTecnico?: string | null;
  observacionesEsteticas?: Record<string, any> | null;
  costoEstimado?: number | null;
}

export interface CrearOrdenDto {
  clienteId: string;
  usuarioTecnicoId?: string | null;
  pagoACuenta?: number;
  equipos: EquipoOrdenInputDto[];
}

export interface ActualizarOrdenDto {
  usuarioTecnicoId?: string | null;
  pagoACuenta?: number;
}

export interface ActualizarEquipoOrdenDto {
  problemaReportado?: string;
  diagnosticoTecnico?: string | null;
  observacionesEsteticas?: Record<string, any> | null;
  costoEstimado?: number | null;
}

export interface CambiarEstadoEquipoDto {
  estado: EstadoEquipoOrden;
}

export interface AgregarItemOrdenDto {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
}
