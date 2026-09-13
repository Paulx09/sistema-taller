import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Search,
  CheckCircle,
  X,
  Receipt,
  History,
  Loader2,
  ChevronDown,
  ChevronUp,
  Calendar as CalendarIcon,
  QrCode,
  AlertTriangle,
  FileDown,
  MessageCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ClienteCombobox } from '@/components/forms/ClienteCombobox';
import { clienteService } from '@/services/cliente.service';
import { crearVenta, listarVentasHoy, listarVentas, obtenerVenta } from '@/services/venta.service';
import { pdf } from '@react-pdf/renderer';
import { VentaPDFDoc } from '@/pages/VentaPDF';
import api from '@/services/api';
import type { Producto, Venta, DetalleVenta, Cliente } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SeriesEscanerModal } from '@/components/SeriesEscanerModal';

// Inline mini-toast
type ToastMsg = { id: number; title: string; description?: string; variant?: 'default' | 'destructive' };

function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  // Usamos un contador en ref
  const counter = useRef(0);
  const toast = useCallback((msg: Omit<ToastMsg, 'id'>) => {
    const id = ++counter.current;
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
  numerosSerie?: string[]; // Para productos que requieren serie
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

// Helper para abrir enlaces externos (compatible Electron y Web)
const abrirEnlaceExterno = (url: string) => {
  if (typeof window !== 'undefined' && (window as any).electronAPI?.openExternal) {
    (window as any).electronAPI.openExternal(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

// Generador de enlace de WhatsApp
const generarEnlaceWhatsApp = (venta: any, telefonoDestino: string) => {
  const telLimpio = telefonoDestino.replace(/\D/g, '');
  const telFormateado = telLimpio.startsWith('51') ? telLimpio : `51${telLimpio}`;

  const clienteNombre = venta.cliente?.nombre || venta.clienteNombre || 'Estimado(a) Cliente';
  const codigo = venta.codigoFormateado || `VTA-${venta.codigoCorrelativo}`;
  const totalFmt = fmt(Number(venta.total));
  const metodo = venta.metodoPago
    ? METODOS_PAGO.find((m) => m.value === venta.metodoPago)?.label || venta.metodoPago
    : 'Efectivo';

  let lineasItems = '';
  if (venta.detalles && venta.detalles.length > 0) {
    lineasItems = venta.detalles
      .map((d: any) => {
        const prodNombre = d.producto?.nombre || 'Producto';
        const cant = d.cantidad;
        const sub = fmt(Number(d.subtotal || (d.precioUnitario * d.cantidad)));
        return `• ${cant}x ${prodNombre} - ${sub}`;
      })
      .join('\n');
  }

  const texto = `¡Hola ${clienteNombre}! 👋\nGracias por tu compra en nuestro taller/tienda.\n\n📄 *Comprobante:* ${codigo}\n💳 *Método de pago:* ${metodo}\n${lineasItems ? `\n🛒 *Detalle de compra:*\n${lineasItems}\n` : ''}\n💰 *Total Pagado:* ${totalFmt}\n\n¡Esperamos verte pronto!`;

  return `https://wa.me/${telFormateado}?text=${encodeURIComponent(texto)}`;
};

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
  const [clienteId, setClienteId] = useState<string>('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('EFECTIVO');
  const [procesando, setProcesando] = useState(false);
  const [ultimaVenta, setUltimaVenta] = useState<Venta | null>(null);

  // Estados para modal WhatsApp
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [ventaParaWhatsApp, setVentaParaWhatsApp] = useState<Venta | null>(null);
  const [telefonoWhatsAppInput, setTelefonoWhatsAppInput] = useState('');
  const [errorTelefonoWhatsApp, setErrorTelefonoWhatsApp] = useState<string | null>(null);

  // Estados para series
  const [seriesModalOpen, setSeriesModalOpen] = useState(false);
  const [productoSerieActual, setProductoSerieActual] = useState<{
    producto: Producto;
    cantidadRequerida: number;
  } | null>(null);

  // Historial state
  const [ventasHoy, setVentasHoy] = useState<Venta[]>([]);
  const [cargandoVentas, setCargandoVentas] = useState(false);
  const [expandida, setExpandida] = useState<string | null>(null);

  // PDF descarga
  const [descargandoPDFId, setDescargandoPDFId] = useState<string | null>(null);

  // Historial completo state
  const [ventasHistorial, setVentasHistorial] = useState<Venta[]>([]);
  const [totalVentas, setTotalVentas] = useState(0);
  const [paginaActual, setPaginaActual] = useState(1);
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>(undefined);
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>(undefined);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  // Cargar categorías y clientes
  useEffect(() => {
    api.get('/categorias?limit=100').then((r) => {
      setCategorias(r.data.data || []);
    });
    clienteService.getAll({ limit: 100 }).then((r) => {
      setClientes(r.clientes || []);
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
      // Filtrar productos sin precio de venta definido (precios pendientes)
      const productosFiltrados = (r.data.data || []).filter((p: any) => Number(p.precioVenta) > 0);
      setProductos(productosFiltrados);
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
      if (fechaDesde) params.desde = format(fechaDesde, 'yyyy-MM-dd');
      if (fechaHasta) params.hasta = format(fechaHasta, 'yyyy-MM-dd');
      
      const response = await listarVentas(params);
      let ventas = response.data as Venta[];
      
      // Filtrar por cliente en el frontend (si el backend no lo soporta)
      if (busquedaCliente.trim()) {
        const search = busquedaCliente.toLowerCase();
        ventas = ventas.filter(v => 
          v.clienteNombre?.toLowerCase().includes(search) ||
          v.codigoFormateado?.toLowerCase().includes(search)
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

  // Ref que espeja el carrito — permite leer el estado actual sincrónicamente
  const carritoRef = useRef<ItemCarrito[]>([]);

  // Sincronizar ref con el estado
  const setCarritoSync = useCallback((updater: (prev: ItemCarrito[]) => ItemCarrito[]) => {
    setCarrito((prev) => {
      const next = updater(prev);
      carritoRef.current = next;
      return next;
    });
  }, []);

  // Carrito: agregar
  const agregarAlCarrito = (p: Producto) => {
    if (!p.esServicio && p.stockActual === 0) return;

    // Bloquear productos cuyo precio de venta está por debajo del CPP
    if (Number(p.precioVenta) < Number(p.precioCompra)) {
      toast({
        title: 'Producto en pérdida',
        description: `El precio de venta de "${p.nombre}" (${fmt(Number(p.precioVenta))}) es menor al costo (${fmt(Number(p.precioCompra))}). Actualiza el precio antes de venderlo.`,
        variant: 'destructive',
      });
      return;
    }

    const prevCarrito = carritoRef.current;
    const existente = prevCarrito.find((i) => i.producto.id === p.id);
    const maxStock = p.esServicio ? Infinity : p.stockActual;

    if (existente && existente.cantidad >= maxStock) {
      toast({ title: 'Stock máximo alcanzado', variant: 'destructive' });
      return;
    }

    // Agregar al carrito normalmente (sin abrir modal)
    setCarritoSync((prev) => {
      const item = prev.find((i) => i.producto.id === p.id);
      if (!item) {
        return [...prev, { producto: p, cantidad: 1, precioUnitario: p.precioVenta }];
      }
      return prev.map((i) =>
        i.producto.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i
      );
    });
  };

  // Abrir modal de series manualmente
  const abrirModalSeries = (item: ItemCarrito) => {
    setProductoSerieActual({
      producto: item.producto,
      cantidadRequerida: item.cantidad,
    });
    setSeriesModalOpen(true);
  };


  // Carrito: cambiar cantidad
  const cambiarCantidad = (productoId: string, delta: number) => {
    const itemActual = carritoRef.current.find((i) => i.producto.id === productoId);
    if (!itemActual) return;

    const nuevaCantidad = itemActual.cantidad + delta;
    const maxStock = itemActual.producto.esServicio ? Infinity : itemActual.producto.stockActual;
    const cantidadFinal = Math.min(Math.max(nuevaCantidad, 0), maxStock);

    // Actualizar cantidad normalmente
    setCarritoSync((prev) =>
      prev
        .map((i) => {
          if (i.producto.id !== productoId) return i;
          return { ...i, cantidad: cantidadFinal };
        })
        .filter((i) => i.cantidad > 0)
    );
  };

  const setCantidad = (productoId: string, val: string) => {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 0) return;
    setCarritoSync((prev) =>
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
    setCarritoSync((prev) => prev.filter((i) => i.producto.id !== productoId));

  const vaciarCarrito = () => {
    carritoRef.current = [];
    setCarrito([]);
  };

  // Handler para cuando se completan las series en el modal
  const handleSeriesCompletas = (series: string[]) => {
    if (!productoSerieActual) return;

    const { producto, cantidadRequerida } = productoSerieActual;

    setCarritoSync((prev) => {
      const existente = prev.find((i) => i.producto.id === producto.id);
      if (existente) {
        // Actualizar item existente con las nuevas series
        return prev.map((i) =>
          i.producto.id === producto.id
            ? { ...i, cantidad: cantidadRequerida, numerosSerie: series }
            : i
        );
      } else {
        // Agregar nuevo item con las series
        return [
          ...prev,
          {
            producto,
            cantidad: cantidadRequerida,
            precioUnitario: producto.precioVenta,
            numerosSerie: series,
          },
        ];
      }
    });

    // Cerrar modal y limpiar estado
    setSeriesModalOpen(false);
    setProductoSerieActual(null);
  };

  // Cálculos
  const total = carrito.reduce((s, i) => s + i.precioUnitario * i.cantidad, 0);
  const gananciaProyectada = carrito.reduce(
    (s, i) => s + (i.precioUnitario - i.producto.precioCompra) * i.cantidad, 0
  );
  const hayItemsEnPerdida = carrito.some(
    (i) => Number(i.precioUnitario) < Number(i.producto.precioCompra)
  );

  // Descargar PDF de venta
  const handleDescargarPDF = async (ventaId: string, codigo: string) => {
    setDescargandoPDFId(ventaId);
    try {
      const r = await obtenerVenta(ventaId);
      const blob = await pdf(<VentaPDFDoc venta={r.data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${codigo}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Error', description: 'No se pudo generar el PDF.', variant: 'destructive' });
    } finally {
      setDescargandoPDFId(null);
    }
  };

  // Finalizar venta
  const finalizarVenta = async () => {
    if (carrito.length === 0) return;

    // Validar que productos con requiereSerie tengan todas sus series
    const faltanSeries = carrito.filter(
      (item) =>
        item.producto.requiereSerie &&
        (!item.numerosSerie || item.numerosSerie.length !== item.cantidad)
    );

    if (faltanSeries.length > 0) {
      const nombres = faltanSeries.map((i) => i.producto.nombre).join(', ');
      toast({
        title: 'Faltan números de serie',
        description: `Los siguientes productos requieren números de serie: ${nombres}`,
        variant: 'destructive',
      });
      return;
    }

    setProcesando(true);
    try {
      const resultado = await crearVenta({
        clienteId: clienteId || undefined,
        clienteNombre: clienteNombre.trim() || undefined,
        metodoPago,
        detalles: carrito.map((i) => ({
          productoId: i.producto.id,
          cantidad: Number(i.cantidad),
          precioUnitario: Number(i.precioUnitario),
          numerosSerie: i.numerosSerie, // Incluir series en el payload
        })),
      });

      if (resultado.data) {
        setUltimaVenta(resultado.data as Venta);
      }

      toast({
        title: '¡Venta registrada!',
        description: (resultado as any).mensaje || 'La venta se completó correctamente.',
      });

      // Limpiar carrito y refrescar ventas del día
      setCarrito([]);
      setClienteId('');
      setClienteNombre('');
      setClienteSeleccionado(null);
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

  // Manejo de WhatsApp
  const handleAbrirWhatsApp = (venta: Venta) => {
    const tel = venta.cliente?.telefono;
    if (tel && tel.replace(/\D/g, '').length >= 8) {
      const url = generarEnlaceWhatsApp(venta, tel);
      abrirEnlaceExterno(url);
    } else {
      setVentaParaWhatsApp(venta);
      setTelefonoWhatsAppInput('');
      setErrorTelefonoWhatsApp(null);
      setWhatsAppModalOpen(true);
    }
  };

  const handleConfirmarEnvioWhatsApp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ventaParaWhatsApp) return;
    const telLimpio = telefonoWhatsAppInput.replace(/\D/g, '');
    if (telLimpio.length < 8) {
      setErrorTelefonoWhatsApp('Ingresa un número de celular válido (mínimo 8 o 9 dígitos)');
      return;
    }
    const url = generarEnlaceWhatsApp(ventaParaWhatsApp, telefonoWhatsAppInput);
    abrirEnlaceExterno(url);
    setWhatsAppModalOpen(false);
    setVentaParaWhatsApp(null);
    setTelefonoWhatsAppInput('');
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
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-foreground border border-border hover:bg-muted/70'
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
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-foreground border border-border hover:bg-muted/70'
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
          <section className="flex flex-col w-full max-w-md xl:max-w-lg bg-background flex-shrink-0 border-l border-border">
            {/* Header carrito */}
            <div className="px-5 py-3.5 border-b border-border flex justify-between items-center flex-shrink-0">
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
                  className="text-xs text-destructive hover:text-destructive/80 font-medium flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Vaciar
                </button>
              )}
            </div>

            {/* 1. CAMPOS (Parte Superior) */}
            <div className="p-4 border-b border-border bg-muted/10 space-y-3 flex-shrink-0">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Cliente
                </label>
                <ClienteCombobox
                  value={clienteId}
                  clienteSeleccionado={clienteSeleccionado}
                  onChange={(id, nombre, cli) => {
                    setClienteId(id);
                    setClienteNombre(nombre);
                    setClienteSeleccionado(cli ?? null);
                  }}
                  clientes={clientes}
                  onClienteCreado={(nuevo) => {
                    setClientes((prev) => [nuevo, ...prev]);
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Método de Pago
                </label>
                <Select value={metodoPago} onValueChange={(v) => setMetodoPago(v as MetodoPago)}>
                  <SelectTrigger className="w-full bg-background text-sm h-9">
                    <SelectValue placeholder="Método de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    {METODOS_PAGO.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 2. TABLA DE PRODUCTOS (Área central con scroll) */}
            <div className="flex-1 overflow-y-auto min-h-0">
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
                      <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[32%]">Producto</th>
                      <th className="px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center w-[18%]">Cant.</th>
                      <th className="px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right w-[16%]">P.Unit</th>
                      <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right w-[16%]">Total</th>
                      <th className="px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center w-[14%]">Series</th>
                      <th className="py-2.5 pr-3 w-6" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {carrito.map((item) => (
                      <tr key={item.producto.id} className={cn("group hover:bg-muted/30 transition-colors", Number(item.precioUnitario) < Number(item.producto.precioCompra) && "bg-red-50/50 dark:bg-red-950/20")}>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm leading-tight">{item.producto.nombre}</span>
                            {Number(item.precioUnitario) < Number(item.producto.precioCompra) && (
                              <span title={`Precio de venta (${fmt(item.precioUnitario)}) menor al costo (${fmt(Number(item.producto.precioCompra))})`}>
                                <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground leading-tight mt-0.5">
                            {[item.producto.marca, item.producto.modelo].filter(Boolean).join(' · ') || '—'}
                          </div>
                        </td>
                        <td className="px-2 py-2.5">
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
                        <td className="px-2 py-2.5 text-right text-sm text-muted-foreground font-medium">
                          {fmt(item.precioUnitario)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-sm font-bold">
                          {fmt(item.precioUnitario * item.cantidad)}
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          {item.producto.requiereSerie ? (
                            <div className="flex flex-col items-center gap-1">
                              <Badge
                                variant={(item.numerosSerie?.length ?? 0) === item.cantidad ? "default" : "destructive"}
                                className="text-xs whitespace-nowrap"
                              >
                                {(item.numerosSerie?.length ?? 0) === item.cantidad
                                  ? "✓ Completo"
                                  : `⚠ ${item.cantidad - (item.numerosSerie?.length ?? 0)}`}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => abrirModalSeries(item)}
                                className="h-6 text-xs px-2"
                              >
                                <QrCode className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-right">
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

            {/* 3. RESUMEN Y ACCIONES (Parte Inferior) */}
            <div className="px-5 py-4 border-t border-border bg-muted/30 flex-shrink-0 space-y-3">
              {carrito.length > 0 && (
                <>
                  {/* Ganancia proyectada */}
                  <div className={cn(
                    "flex justify-between items-center px-3 py-2 rounded-lg border",
                    hayItemsEnPerdida
                      ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                      : "bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900"
                  )}>
                    <div className={cn(
                      "flex items-center gap-1.5",
                      hayItemsEnPerdida ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"
                    )}>
                      {hayItemsEnPerdida
                        ? <AlertTriangle className="h-4 w-4" />
                        : <span className="material-symbols-outlined text-[16px]">visibility_off</span>
                      }
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        {hayItemsEnPerdida ? 'Venta en Pérdida' : 'Ganancia Proyectada'}
                      </span>
                    </div>
                    <span className={cn(
                      "text-sm font-bold",
                      hayItemsEnPerdida ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"
                    )}>{fmt(gananciaProyectada)}</span>
                  </div>

                  {/* Total */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-baseline pt-1.5 border-t border-border">
                      <span className="text-lg font-bold">Total a Pagar</span>
                      <span className="text-2xl font-bold tracking-tight text-primary">{fmt(total)}</span>
                    </div>
                  </div>
                </>
              )}

              {hayItemsEnPerdida && (
                <p className="text-xs text-red-600 dark:text-red-400 text-center font-medium">
                  Hay productos con precio de venta menor al costo. Corrígelos para poder vender.
                </p>
              )}

              <Button
                onClick={finalizarVenta}
                disabled={carrito.length === 0 || procesando || hayItemsEnPerdida}
                className="w-full h-11 text-base font-bold gap-2 rounded-xl shadow-md"
              >
                {procesando ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Procesando...</>
                ) : (
                  <><CheckCircle className="h-5 w-5" /> Finalizar Venta</>
                )}
              </Button>

              {/* Botones rápidos de última venta (PDF y WhatsApp) */}
              {ultimaVenta && (
                <div className="p-3 bg-card border rounded-xl space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Última venta: {ultimaVenta.codigoFormateado}</span>
                    <span className="text-muted-foreground font-medium">{fmt(Number(ultimaVenta.total))}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5 text-xs h-8"
                      disabled={descargandoPDFId === ultimaVenta.id}
                      onClick={() => handleDescargarPDF(ultimaVenta.id, ultimaVenta.codigoFormateado)}
                    >
                      {descargandoPDFId === ultimaVenta.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FileDown className="h-3.5 w-3.5" />
                      )}
                      Descargar PDF
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5 text-xs h-8 bg-green-600 hover:bg-green-700 text-white font-semibold"
                      onClick={() => handleAbrirWhatsApp(ultimaVenta)}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </Button>
                  </div>
                </div>
              )}
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
                              <tr className="font-bold">
                                <td colSpan={3} className="pt-1.5 text-right">Total</td>
                                <td className="pt-1.5 text-right">{fmt(total)}</td>
                              </tr>
                            </tfoot>
                          </table>
                          <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-border">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-xs h-8"
                              disabled={descargandoPDFId === venta.id}
                              onClick={() => handleDescargarPDF(venta.id, venta.codigoFormateado)}
                            >
                              {descargandoPDFId === venta.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <FileDown className="h-3.5 w-3.5" />}
                              Descargar PDF
                            </Button>
                            <Button
                              size="sm"
                              className="gap-1.5 text-xs h-8 bg-green-600 hover:bg-green-700 text-white font-semibold"
                              onClick={() => handleAbrirWhatsApp(venta)}
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              WhatsApp
                            </Button>
                          </div>
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full h-9 justify-start text-left font-normal text-sm',
                        !fechaDesde && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fechaDesde ? format(fechaDesde, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fechaDesde}
                      onSelect={(date) => { setFechaDesde(date); setPaginaActual(1); }}
                      locale={es}
                      disabled={(date) => {
                        // No puede ser fecha futura
                        if (date > new Date()) return true;
                        // No puede ser posterior a fechaHasta
                        if (fechaHasta && date > fechaHasta) return true;
                        return false;
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Fecha Hasta</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full h-9 justify-start text-left font-normal text-sm',
                        !fechaHasta && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fechaHasta ? format(fechaHasta, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fechaHasta}
                      onSelect={(date) => { setFechaHasta(date); setPaginaActual(1); }}
                      locale={es}
                      disabled={(date) => {
                        // No puede ser fecha futura
                        if (date > new Date()) return true;
                        // No puede ser anterior a fechaDesde
                        if (fechaDesde && date < fechaDesde) return true;
                        return false;
                      }}
                    />
                  </PopoverContent>
                </Popover>
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
                    setFechaDesde(undefined);
                    setFechaHasta(undefined);
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
                                <tr className="font-bold">
                                  <td colSpan={3} className="pt-1.5 text-right">Total</td>
                                  <td className="pt-1.5 text-right">{fmt(total)}</td>
                                </tr>
                              </tfoot>
                            </table>
                            <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-border">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs h-8"
                                disabled={descargandoPDFId === venta.id}
                                onClick={() => handleDescargarPDF(venta.id, venta.codigoFormateado)}
                              >
                                {descargandoPDFId === venta.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <FileDown className="h-3.5 w-3.5" />}
                                Descargar PDF
                              </Button>
                              <Button
                                size="sm"
                                className="gap-1.5 text-xs h-8 bg-green-600 hover:bg-green-700 text-white font-semibold"
                                onClick={() => handleAbrirWhatsApp(venta)}
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                WhatsApp
                              </Button>
                            </div>
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
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg text-sm w-80 animate-in slide-in-from-right-full fade-in duration-300',
              t.variant === 'destructive'
                ? 'bg-destructive text-destructive-foreground border-destructive/30'
                : 'bg-background border-border text-foreground'
            )}
          >
            <div className="flex-1">
              <p className="font-semibold">{t.title}</p>
              {t.description && <p className="text-xs opacity-80 mt-0.5">{t.description}</p>}
            </div>
            <button 
              onClick={() => dismiss(t.id)} 
              className="flex-shrink-0 rounded-md p-1 hover:bg-white/20 transition-colors"
              aria-label="Cerrar notificación"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Modal de series */}
      {productoSerieActual && (
        <SeriesEscanerModal
          isOpen={seriesModalOpen}
          onClose={() => {
            setSeriesModalOpen(false);
            setProductoSerieActual(null);
          }}
          modo="venta"
          productoNombre={productoSerieActual.producto.nombre}
          productoId={productoSerieActual.producto.id}
          cantidad={productoSerieActual.cantidadRequerida}
          onSeriesCompletas={handleSeriesCompletas}
        />
      )}

      {/* Modal de confirmación de Teléfono WhatsApp para ventas sin celular */}
      <Dialog open={whatsAppModalOpen} onOpenChange={setWhatsAppModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Enviar Comprobante por WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Esta venta no tiene un número registrado. Ingresa el número de WhatsApp para enviar el comprobante de venta <span className="font-semibold text-foreground">({ventaParaWhatsApp?.codigoFormateado})</span>:
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Número de WhatsApp</label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground bg-muted px-2.5 py-2 rounded-lg border border-border">
                  +51
                </span>
                <Input
                  placeholder="9XXXXXXXX"
                  value={telefonoWhatsAppInput}
                  onChange={(e) => {
                    setTelefonoWhatsAppInput(e.target.value.replace(/[^0-9]/g, ''));
                    if (errorTelefonoWhatsApp) setErrorTelefonoWhatsApp('');
                  }}
                  maxLength={9}
                  className={cn(
                    "text-sm font-medium",
                    errorTelefonoWhatsApp && "border-destructive focus-visible:ring-destructive"
                  )}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleConfirmarEnvioWhatsApp();
                    }
                  }}
                  autoFocus
                />
              </div>
              {errorTelefonoWhatsApp && (
                <p className="text-xs text-destructive">{errorTelefonoWhatsApp}</p>
              )}
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setWhatsAppModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
              onClick={handleConfirmarEnvioWhatsApp}
            >
              <MessageCircle className="h-4 w-4" />
              Abrir WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
