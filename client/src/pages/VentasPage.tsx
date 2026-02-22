import { useState, useEffect, useRef, useCallback } from 'react';
import { ShoppingCart, Trash2, Plus, Minus, Search, CheckCircle, X, Receipt, History, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { crearVenta, listarVentasHoy, listarVentas } from '@/services/venta.service';
import api from '@/services/api';
import type { Producto, Venta, DetalleVenta } from '@/types';
import { cn } from '@/lib/utils';

// Inline mini-toast
type ToastMsg = { id: number; title: string; description?: string; variant?: 'default' | 'destructive' };

function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const toast = useCallback((msg: Omit<ToastMsg, 'id'>) => {
    const id = Date.now();
    setToasts((p) => [...p, { ...msg, id }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);
  return { toast, toasts, dismiss: (id: number) => setToasts((p) => p.filter((t) => t.id !== id)) };
}

// Tipos locales
interface ItemCarrito {
  producto: Producto;
  cantidad: number;
  precioUnitario: number;
}

type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN';
type Vista = 'pos' | 'historial' | 'historial-completo';

// Helpers
const fmt = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);

const stockLabel = (p: Producto) => {
  if (p.esServicio) return { text: 'Servicio', color: 'bg-blue-50 text-blue-700 ring-blue-600/20' };
  if (p.stockActual === 0) return { text: 'Agotado', color: 'bg-red-50 text-red-700 ring-red-600/20' };
  if (p.stockActual <= p.stockMinimo) return { text: `Stock: ${p.stockActual}`, color: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20' };
  return { text: `Stock: ${p.stockActual}`, color: 'bg-green-50 text-green-700 ring-green-600/20' };
};

const METODOS_PAGO: { value: MetodoPago; label: string }[] = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA', label: 'Tarjeta (Visa/Mastercard)' },
  { value: 'YAPE_PLIN', label: 'Yape / Plin' },
];

// Componente principal
export function VentasPage() {
  const { toast, toasts, dismiss } = useToast();
  const [vista, setVista] = useState<Vista>('pos');

  // POS state
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<{ id: string; nombre: string }[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [clienteNombre, setClienteNombre] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('EFECTIVO');
  const [procesando, setProcesando] = useState(false);

  // Historial state
  const [ventasHoy, setVentasHoy] = useState<Venta[]>([]);
  const [cargandoVentas, setCargandoVentas] = useState(false);
  const [expandida, setExpandida] = useState<string | null>(null);

  // Historial completo state
  const [ventasHistorial, setVentasHistorial] = useState<Venta[]>([]);
  const [totalVentas, setTotalVentas] = useState(0);
  const [paginaActual, setPaginaActual] = useState(1);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  // Cargar categorías
  useEffect(() => {
    api.get('/categorias?limit=100').then((r) => {
      setCategorias(r.data.data || []);
    });
  }, []);

  // Cargar productos con debounce
  const cargarProductos = useCallback(async (q: string, catId: string) => {
    setCargandoProductos(true);
    try {
      const params: Record<string, string> = { limit: '60' };
      if (q) params.busqueda = q;
      if (catId) params.categoriaId = catId;
      const r = await api.get('/productos', { params });
      setProductos(r.data.data || []);
    } finally {
      setCargandoProductos(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => cargarProductos(busqueda, categoriaFiltro), 300);
    return () => clearTimeout(timer);
  }, [busqueda, categoriaFiltro, cargarProductos]);

  // Cargar ventas del día
  const cargarVentasHoy = useCallback(async () => {
    setCargandoVentas(true);
    try {
      const r = await listarVentasHoy();
      setVentasHoy(r.data as Venta[]);
    } finally {
      setCargandoVentas(false);
    }
  }, []);

  useEffect(() => {
    cargarVentasHoy();
  }, [cargarVentasHoy]);

  // Cargar historial completo
  const cargarHistorialCompleto = useCallback(async () => {
    setCargandoHistorial(true);
    try {
      const params: any = { page: paginaActual, limit: 20 };
      if (fechaDesde) params.desde = fechaDesde;
      if (fechaHasta) params.hasta = fechaHasta;
      
      const response = await listarVentas(params);
      let ventas = response.data as Venta[];
      
      // Filtrar por cliente en el frontend (si el backend no lo soporta)
      if (busquedaCliente.trim()) {
        const search = busquedaCliente.toLowerCase();
        ventas = ventas.filter(v => 
          v.clienteNombre?.toLowerCase().includes(search) ||
          v.codigoCorrelativo?.toString().includes(search)
        );
      }
      
      setVentasHistorial(ventas);
      setTotalVentas((response as any).total || ventas.length);
    } finally {
      setCargandoHistorial(false);
    }
  }, [paginaActual, fechaDesde, fechaHasta, busquedaCliente]);

  useEffect(() => {
    if (vista === 'historial-completo') {
      cargarHistorialCompleto();
    }
  }, [vista, cargarHistorialCompleto]);

  // Carrito: agregar
  const agregarAlCarrito = (p: Producto) => {
    if (!p.esServicio && p.stockActual === 0) return;
    setCarrito((prev) => {
      const existente = prev.find((i) => i.producto.id === p.id);
      if (existente) {
        const maxStock = p.esServicio ? Infinity : p.stockActual;
        if (existente.cantidad >= maxStock) {
          toast({ title: 'Stock máximo alcanzado', variant: 'destructive' });
          return prev;
        }
        return prev.map((i) =>
          i.producto.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [...prev, { producto: p, cantidad: 1, precioUnitario: p.precioVenta }];
    });
  };

  // Carrito: cambiar cantidad
  const cambiarCantidad = (productoId: string, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((i) => {
          if (i.producto.id !== productoId) return i;
          const nueva = i.cantidad + delta;
          const maxStock = i.producto.esServicio ? Infinity : i.producto.stockActual;
          const clamped = Math.min(Math.max(nueva, 0), maxStock);
          return { ...i, cantidad: clamped };
        })
        .filter((i) => i.cantidad > 0)
    );
  };

  const setCantidad = (productoId: string, val: string) => {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 0) return;
    setCarrito((prev) =>
      prev
        .map((i) => {
          if (i.producto.id !== productoId) return i;
          const maxStock = i.producto.esServicio ? Infinity : i.producto.stockActual;
          return { ...i, cantidad: Math.min(n, maxStock) };
        })
        .filter((i) => i.cantidad > 0)
    );
  };

  const quitarItem = (productoId: string) =>
    setCarrito((prev) => prev.filter((i) => i.producto.id !== productoId));

  const vaciarCarrito = () => setCarrito([]);

  // Cálculos
  // El precio de venta ya incluye IGV. Subtotal = total / 1.18
  const totalConIgv = carrito.reduce((s, i) => s + i.precioUnitario * i.cantidad, 0);
  const subtotalSinIgv = totalConIgv / 1.18;
  const igv = totalConIgv - subtotalSinIgv;
  const gananciaProyectada = carrito.reduce(
    (s, i) => s + (i.precioUnitario - i.producto.precioCompra) * i.cantidad, 0
  );

  // Finalizar venta
  const finalizarVenta = async () => {
    if (carrito.length === 0) return;
    setProcesando(true);
    try {
      const resultado = await crearVenta({
        clienteNombre: clienteNombre.trim() || undefined,
        metodoPago,
        detalles: carrito.map((i) => ({
          productoId: i.producto.id,
          cantidad: Number(i.cantidad),
          precioUnitario: Number(i.precioUnitario),
        })),
      });

      toast({
        title: '¡Venta registrada!',
        description: (resultado as any).mensaje || 'La venta se completó correctamente.',
      });

      // Limpiar carrito y refrescar ventas del día
      setCarrito([]);
      setClienteNombre('');
      setMetodoPago('EFECTIVO');
      cargarVentasHoy();
      // Recargar productos para actualizar stock
      cargarProductos(busqueda, categoriaFiltro);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Error al procesar la venta';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setProcesando(false);
    }
  };

  // Render 
  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div className="flex items-center gap-1 px-6 pt-4 pb-0 bg-background border-b border-border flex-shrink-0">
        <button
          onClick={() => setVista('pos')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
            vista === 'pos'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <ShoppingCart className="h-4 w-4" />
          Nueva Venta
        </button>
        <button
          onClick={() => { setVista('historial'); cargarVentasHoy(); }}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
            vista === 'historial'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <History className="h-4 w-4" />
          Ventas de Hoy
          {ventasHoy.length > 0 && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
              {ventasHoy.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setVista('historial-completo'); setPaginaActual(1); }}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
            vista === 'historial-completo'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Receipt className="h-4 w-4" />
          Historial Completo
        </button>
      </div>

      {/* Vista POS */}
      {vista === 'pos' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Columna izquierda: Catálogo */}
          <section className="flex flex-col flex-1 border-r border-border bg-muted/20 overflow-hidden">
            {/* Header búsqueda */}
            <div className="p-5 pb-3 bg-background border-b border-border shadow-sm z-10 flex-shrink-0">
              <h2 className="text-xl font-bold tracking-tight mb-1">Nueva Venta</h2>
              <p className="text-sm text-muted-foreground mb-3">Busca y agrega productos al carrito</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, marca o modelo..."
                  className="pl-9 pr-4 h-10"
                  autoFocus
                />
                {busqueda && (
                  <button
                    onClick={() => setBusqueda('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filtro por categoría */}
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  onClick={() => setCategoriaFiltro('')}
                  className={cn(
                    'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                    !categoriaFiltro
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-background text-muted-foreground border border-border hover:bg-muted'
                  )}
                >
                  Todos
                </button>
                {categorias.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaFiltro(cat.id === categoriaFiltro ? '' : cat.id)}
                    className={cn(
                      'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                      cat.id === categoriaFiltro
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-background text-muted-foreground border border-border hover:bg-muted'
                    )}
                  >
                    {cat.nombre}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid de productos */}
            <div className="flex-1 overflow-y-auto p-5">
              {cargandoProductos ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : productos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Search className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm">No se encontraron productos</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {productos.map((p) => {
                    const stock = stockLabel(p);
                    const enCarrito = carrito.find((i) => i.producto.id === p.id);
                    const agotado = !p.esServicio && p.stockActual === 0;

                    return (
                      <button
                        key={p.id}
                        onClick={() => agregarAlCarrito(p)}
                        disabled={agotado}
                        className={cn(
                          'group flex flex-col justify-between rounded-xl border p-4 text-left transition-all',
                          agotado
                            ? 'opacity-50 cursor-not-allowed border-border bg-muted/30'
                            : enCarrito
                              ? 'border-primary ring-1 ring-primary bg-primary/5 shadow-sm hover:shadow-md'
                              : 'border-border bg-background hover:border-primary hover:ring-1 hover:ring-primary shadow-sm hover:shadow-md'
                        )}
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className={cn(
                              'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                              stock.color
                            )}>
                              {stock.text}
                            </span>
                            {enCarrito && (
                              <span className="text-xs font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                                ×{enCarrito.cantidad}
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-sm line-clamp-2 mb-0.5">{p.nombre}</h3>
                          <p className="text-xs text-muted-foreground">
                            {[p.marca, p.modelo].filter(Boolean).join(' · ') || p.categoria?.nombre || '—'}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-base font-bold">{fmt(p.precioVenta)}</span>
                          <div className={cn(
                            'flex items-center justify-center w-8 h-8 rounded-full transition-colors',
                            agotado
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-white'
                          )}>
                            <Plus className="h-4 w-4" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Columna derecha: Carrito + Checkout */}
          <section className="flex flex-col w-full max-w-sm xl:max-w-md bg-background flex-shrink-0">
            {/* Header carrito */}
            <div className="px-5 py-4 border-b border-border flex justify-between items-center flex-shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2">
                Carrito
                {carrito.length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {carrito.length}
                  </span>
                )}
              </h2>
              {carrito.length > 0 && (
                <button
                  onClick={vaciarCarrito}
                  className="text-sm text-destructive hover:text-destructive/80 font-medium flex items-center gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  Vaciar
                </button>
              )}
            </div>

            {/* Tabla del carrito */}
            <div className="flex-1 overflow-y-auto">
              {carrito.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                  <ShoppingCart className="h-12 w-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">El carrito está vacío</p>
                  <p className="text-xs">Haz clic en un producto para agregarlo</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-muted/40 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[38%]">Producto</th>
                      <th className="px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center w-[24%]">Cant.</th>
                      <th className="px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right w-[18%]">P.Unit</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right w-[16%]">Total</th>
                      <th className="py-2.5 pr-3 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {carrito.map((item) => (
                      <tr key={item.producto.id} className="group hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-sm leading-tight">{item.producto.nombre}</div>
                          <div className="text-xs text-muted-foreground leading-tight mt-0.5">
                            {[item.producto.marca, item.producto.modelo].filter(Boolean).join(' ') || '—'}
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => cambiarCantidad(item.producto.id, -1)}
                              className="h-6 w-6 rounded flex items-center justify-center bg-muted hover:bg-muted-foreground/20 transition-colors"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <input
                              type="text"
                              value={item.cantidad}
                              onChange={(e) => setCantidad(item.producto.id, e.target.value)}
                              className="w-10 text-center text-sm border border-border rounded bg-background py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button
                              onClick={() => cambiarCantidad(item.producto.id, 1)}
                              className="h-6 w-6 rounded flex items-center justify-center bg-muted hover:bg-muted-foreground/20 transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-right text-sm text-muted-foreground font-medium">
                          {fmt(item.precioUnitario)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold">
                          {fmt(item.precioUnitario * item.cantidad)}
                        </td>
                        <td className="py-3 pr-3 text-right">
                          <button
                            onClick={() => quitarItem(item.producto.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Datos del cliente y método de pago */}
            {carrito.length > 0 && (
              <div className="px-5 py-3 border-t border-border bg-muted/20 flex-shrink-0">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Cliente (Opcional)</label>
                    <Input
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                      placeholder="Nombre"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Método de Pago</label>
                    <select
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {METODOS_PAGO.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Resumen y acción */}
            <div className="px-5 py-4 border-t border-border bg-muted/30 flex-shrink-0 space-y-3">
              {carrito.length > 0 && (
                <>
                  {/* Ganancia proyectada */}
                  <div className="flex justify-between items-center px-3 py-2 bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900 rounded-lg">
                    <div className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
                      <span className="material-symbols-outlined text-[16px]">visibility_off</span>
                      <span className="text-xs font-semibold uppercase tracking-wider">Ganancia Proyectada</span>
                    </div>
                    <span className="text-sm font-bold text-green-700 dark:text-green-400">{fmt(gananciaProyectada)}</span>
                  </div>

                  {/* Subtotal, IGV, Total */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Subtotal (sin IGV)</span>
                      <span>{fmt(subtotalSinIgv)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>IGV (18%)</span>
                      <span>{fmt(igv)}</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-1.5 border-t border-border">
                      <span className="text-lg font-bold">Total a Pagar</span>
                      <span className="text-2xl font-bold tracking-tight">{fmt(totalConIgv)}</span>
                    </div>
                  </div>
                </>
              )}

              <Button
                onClick={finalizarVenta}
                disabled={carrito.length === 0 || procesando}
                className="w-full h-12 text-base font-bold gap-2 rounded-xl shadow-lg"
              >
                {procesando ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Procesando...</>
                ) : (
                  <><CheckCircle className="h-5 w-5" /> Finalizar Venta</>
                )}
              </Button>
            </div>
          </section>
        </div>
      )}

      {/* Vista Historial de Hoy */}
      {vista === 'historial' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Ventas de Hoy</h2>
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <Button variant="outline" onClick={cargarVentasHoy} size="sm" className="gap-2">
                <Loader2 className={cn('h-4 w-4', cargandoVentas && 'animate-spin')} />
                Actualizar
              </Button>
            </div>

            {/* Métricas rápidas del día */}
            {ventasHoy.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ventas</p>
                  <p className="text-2xl font-bold mt-1">{ventasHoy.length}</p>
                </div>
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Vendido</p>
                  <p className="text-2xl font-bold mt-1 text-primary">
                    {fmt(ventasHoy.reduce((s, v) => s + parseFloat(v.total), 0))}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ganancia</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">
                    {fmt(ventasHoy.reduce((s, v) => s + parseFloat(v.gananciaTotal), 0))}
                  </p>
                </div>
              </div>
            )}

            {cargandoVentas ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : ventasHoy.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-muted-foreground border border-dashed border-border rounded-xl">
                <Receipt className="h-12 w-12 mb-3 opacity-20" />
                <p className="font-medium">No hay ventas registradas hoy</p>
                <p className="text-sm">Las ventas que realices aparecerán aquí</p>
                <Button variant="outline" className="mt-4 gap-2" onClick={() => setVista('pos')}>
                  <ShoppingCart className="h-4 w-4" />
                  Registrar Venta
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {ventasHoy.map((venta) => {
                  const total = parseFloat(venta.total);
                  const ganancia = parseFloat(venta.gananciaTotal);
                  const subtotalSinIgvV = total / 1.18;
                  const igvV = total - subtotalSinIgvV;
                  const isExpanded = expandida === venta.id;

                  return (
                    <div
                      key={venta.id}
                      className="rounded-xl border border-border bg-background overflow-hidden"
                    >
                      {/* Fila resumen */}
                      <button
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors text-left"
                        onClick={() => setExpandida(isExpanded ? null : venta.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                            #{venta.codigoCorrelativo}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">
                              {venta.clienteNombre || 'Cliente sin nombre'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(venta.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                              {' · '}
                              {METODOS_PAGO.find(m => m.value === venta.metodoPago)?.label || venta.metodoPago}
                              {' · '}
                              {venta.detalles?.length || 0} ítems
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-5 flex-shrink-0">
                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-muted-foreground">Ganancia</p>
                            <p className="text-sm font-semibold text-green-600">{fmt(ganancia)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-base font-bold">{fmt(total)}</p>
                          </div>
                          <Badge
                            variant={venta.estado === 'COMPLETADA' ? 'default' : 'destructive'}
                            className="hidden sm:inline-flex"
                          >
                            {venta.estado}
                          </Badge>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </button>

                      {/* Detalle expandido */}
                      {isExpanded && venta.detalles && (
                        <div className="border-t border-border bg-muted/20 px-5 py-4">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs text-muted-foreground uppercase tracking-wide">
                                <th className="text-left pb-2 font-medium">Producto</th>
                                <th className="text-center pb-2 font-medium">Cant.</th>
                                <th className="text-right pb-2 font-medium">P.Unit</th>
                                <th className="text-right pb-2 font-medium">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {venta.detalles.map((d: DetalleVenta) => (
                                <tr key={d.id}>
                                  <td className="py-2">
                                    <p className="font-medium">{d.producto?.nombre}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {[d.producto?.marca, d.producto?.modelo].filter(Boolean).join(' · ') || '—'}
                                    </p>
                                  </td>
                                  <td className="py-2 text-center">{d.cantidad}</td>
                                  <td className="py-2 text-right">{fmt(parseFloat(d.precioUnitario))}</td>
                                  <td className="py-2 text-right font-semibold">{fmt(parseFloat(d.subtotal))}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="border-t border-border mt-1">
                              <tr className="text-xs text-muted-foreground">
                                <td colSpan={3} className="pt-2 text-right">Subtotal (sin IGV)</td>
                                <td className="pt-2 text-right">{fmt(subtotalSinIgvV)}</td>
                              </tr>
                              <tr className="text-xs text-muted-foreground">
                                <td colSpan={3} className="text-right">IGV (18%)</td>
                                <td className="text-right">{fmt(igvV)}</td>
                              </tr>
                              <tr className="font-bold">
                                <td colSpan={3} className="pt-1.5 text-right">Total</td>
                                <td className="pt-1.5 text-right">{fmt(total)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vista Historial Completo */}
      {vista === 'historial-completo' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Historial Completo de Ventas</h2>
                <p className="text-sm text-muted-foreground">
                  Busca y consulta todas las ventas registradas
                </p>
              </div>
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/30 rounded-xl border border-border">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Fecha Desde</label>
                <Input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => { setFechaDesde(e.target.value); setPaginaActual(1); }}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Fecha Hasta</label>
                <Input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => { setFechaHasta(e.target.value); setPaginaActual(1); }}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Buscar Cliente / Código</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={busquedaCliente}
                    onChange={(e) => { setBusquedaCliente(e.target.value); setPaginaActual(1); }}
                    placeholder="Nombre o #"
                    className="h-9 text-sm pl-9"
                  />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFechaDesde('');
                    setFechaHasta('');
                    setBusquedaCliente('');
                    setPaginaActual(1);
                  }}
                  className="h-9 text-sm"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
                <Button
                  onClick={cargarHistorialCompleto}
                  className="h-9 text-sm"
                >
                  <Search className="h-4 w-4 mr-1" />
                  Buscar
                </Button>
              </div>
            </div>

            {/* Lista de ventas */}
            {cargandoHistorial ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : ventasHistorial.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-muted-foreground border border-dashed border-border rounded-xl">
                <Receipt className="h-12 w-12 mb-3 opacity-20" />
                <p className="font-medium">No se encontraron ventas</p>
                <p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-6">
                  {ventasHistorial.map((venta) => {
                    const total = parseFloat(venta.total);
                    const ganancia = parseFloat(venta.gananciaTotal);
                    const subtotalSinIgvV = total / 1.18;
                    const igvV = total - subtotalSinIgvV;
                    const isExpanded = expandida === venta.id;

                    return (
                      <div
                        key={venta.id}
                        className="rounded-xl border border-border bg-background overflow-hidden"
                      >
                        {/* Fila resumen */}
                        <button
                          className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors text-left"
                          onClick={() => setExpandida(isExpanded ? null : venta.id)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                              #{venta.codigoCorrelativo}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">
                                {venta.clienteNombre || 'Cliente sin nombre'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(venta.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                {' · '}
                                {new Date(venta.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                {' · '}
                                {METODOS_PAGO.find(m => m.value === venta.metodoPago)?.label || venta.metodoPago}
                                {' · '}
                                {venta.detalles?.length || 0} ítems
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-5 flex-shrink-0">
                            <div className="text-right hidden sm:block">
                              <p className="text-xs text-muted-foreground">Ganancia</p>
                              <p className="text-sm font-semibold text-green-600">{fmt(ganancia)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Total</p>
                              <p className="text-base font-bold">{fmt(total)}</p>
                            </div>
                            <Badge
                              variant={venta.estado === 'COMPLETADA' ? 'default' : 'destructive'}
                              className="hidden sm:inline-flex"
                            >
                              {venta.estado}
                            </Badge>
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </button>

                        {/* Detalle expandido */}
                        {isExpanded && venta.detalles && (
                          <div className="border-t border-border bg-muted/20 px-5 py-4">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-xs text-muted-foreground uppercase tracking-wide">
                                  <th className="text-left pb-2 font-medium">Producto</th>
                                  <th className="text-center pb-2 font-medium">Cant.</th>
                                  <th className="text-right pb-2 font-medium">P.Unit</th>
                                  <th className="text-right pb-2 font-medium">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {venta.detalles.map((d: DetalleVenta) => (
                                  <tr key={d.id}>
                                    <td className="py-2">
                                      <p className="font-medium">{d.producto?.nombre}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {[d.producto?.marca, d.producto?.modelo].filter(Boolean).join(' · ') || '—'}
                                      </p>
                                    </td>
                                    <td className="py-2 text-center">{d.cantidad}</td>
                                    <td className="py-2 text-right">{fmt(parseFloat(d.precioUnitario))}</td>
                                    <td className="py-2 text-right font-semibold">{fmt(parseFloat(d.subtotal))}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="border-t border-border mt-1">
                                <tr className="text-xs text-muted-foreground">
                                  <td colSpan={3} className="pt-2 text-right">Subtotal (sin IGV)</td>
                                  <td className="pt-2 text-right">{fmt(subtotalSinIgvV)}</td>
                                </tr>
                                <tr className="text-xs text-muted-foreground">
                                  <td colSpan={3} className="text-right">IGV (18%)</td>
                                  <td className="text-right">{fmt(igvV)}</td>
                                </tr>
                                <tr className="font-bold">
                                  <td colSpan={3} className="pt-1.5 text-right">Total</td>
                                  <td className="pt-1.5 text-right">{fmt(total)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Paginación */}
                {totalVentas > 20 && (
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {((paginaActual - 1) * 20) + 1} - {Math.min(paginaActual * 20, totalVentas)} de {totalVentas} ventas
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                        disabled={paginaActual === 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPaginaActual(p => p + 1)}
                        disabled={paginaActual * 20 >= totalVentas}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast Overlay */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg text-sm w-80 transition-all',
              t.variant === 'destructive'
                ? 'bg-destructive text-destructive-foreground border-destructive/30'
                : 'bg-background border-border text-foreground'
            )}
          >
            <div className="flex-1">
              <p className="font-semibold">{t.title}</p>
              {t.description && <p className="text-xs opacity-80 mt-0.5">{t.description}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100 mt-0.5">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
