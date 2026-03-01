import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { ShoppingBag, Trash2, Search, Loader2, Plus, Receipt, History, Calendar as CalendarIcon, Building2, FileText, ChevronDown, ChevronUp, PackagePlus, QrCode } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { crearCompra, listarCompras, anularCompra } from '@/services/compra.service';
import { listarProveedores } from '@/services/proveedor.service';
import { productoService } from '@/services/producto.service';
import { SugerenciasPrecioModal } from '@/components/SugerenciasPrecioModal';
import api from '@/services/api';
import type { Producto, Proveedor, Compra, CrearDetalleCompraDto, SugerenciaPrecio } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SeriesEscanerModal } from '@/components/SeriesEscanerModal';

// Toast helper
type ToastMsg = { id: number; title: string; description?: string; variant?: 'default' | 'destructive' };
function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const counter = useRef(0);
  const toast = useCallback((msg: Omit<ToastMsg, 'id'>) => {
    const id = ++counter.current;
    setToasts((p) => [...p, { ...msg, id }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);
  return { toast, toasts, dismiss: (id: number) => setToasts((p) => p.filter((t) => t.id !== id)) };
}

// Tipos locales
interface ItemCompra {
  producto: Producto;
  cantidad: number;
  costoUnitario: number;
  numerosSerie?: string[]; // Para productos que requieren serie
}

type Vista = 'nueva' | 'historial';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);

export function ComprasPage() {
  const { toast, toasts, dismiss } = useToast();
  const [vista, setVista] = useState<Vista>('nueva');

  // Nueva compra state
  const [proveedorId, setProveedorId] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [detalles, setDetalles] = useState<ItemCompra[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sugerenciasPrecio, setSugerenciasPrecio] = useState<SugerenciaPrecio[]>([]);
  const [modalSugerenciasOpen, setModalSugerenciasOpen] = useState(false);

  // Historial state
  const [compras, setCompras] = useState<Compra[]>([]);
  const [totalCompras, setTotalCompras] = useState(0);
  const [paginaActual, setPaginaActual] = useState(1);
  const [proveedorFiltro, setProveedorFiltro] = useState('');
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>(undefined);
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>(undefined);
  const [cargandoCompras, setCargandoCompras] = useState(false);
  const [expandida, setExpandida] = useState<string | null>(null);

  // Confirmación de anulación
  const [confirmAnularId, setConfirmAnularId] = useState<string | null>(null);
  const [confirmAnularNumero, setConfirmAnularNumero] = useState<string>('');

  // Modal crear producto rápido
  const [crearProductoDialogOpen, setCrearProductoDialogOpen] = useState(false);
  const [categorias, setCategorias] = useState<{ id: string; nombre: string }[]>([]);
  const [ubicaciones, setUbicaciones] = useState<{ id: string; nombre: string }[]>([]);
  const [ubicacionSinClasificar, setUbicacionSinClasificar] = useState<string>('');
  const [creandoProducto, setCreandoProducto] = useState(false);
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: '',
    categoriaId: '',
    ubicacionId: '',
    marca: '',
    modelo: '',
    stockMinimo: '1',
    requiereSerie: false,
    garantiaProveedorMeses: '',
    garantiaClienteMeses: '',
  });

  // Modal escaneo de series (FASE 3)
  const [seriesModalOpen, setSeriesModalOpen] = useState(false);
  const [productoSerieActual, setProductoSerieActual] = useState<ItemCompra | null>(null);

  // Cargar categorías y ubicaciones
  useEffect(() => {
    // Cargar categorías
    api.get('/categorias?limit=100').then((r) => {
      setCategorias(r.data.data || []);
    });

    // Cargar ubicaciones
    api.get('/ubicaciones?limit=100').then((r) => {
      const ubicacionesData = r.data.data || [];
      setUbicaciones(ubicacionesData);
      
      // Buscar ubicación "SIN CLASIFICAR" como default
      const sinClasificar = ubicacionesData.find(
        (u: any) => u.nombre.toUpperCase() === 'SIN CLASIFICAR'
      );
      
      if (sinClasificar) {
        setUbicacionSinClasificar(sinClasificar.id);
        setNuevoProducto(prev => ({ ...prev, ubicacionId: sinClasificar.id }));
      }
    });
  }, []);

  // Cargar proveedores
  useEffect(() => {
    listarProveedores({ limit: 100 }).then((r) => {
      setProveedores(r.data || []);
    });
  }, []);

  // Cargar productos con debounce (SOLO PRODUCTOS FÍSICOS - NO SERVICIOS)
  const cargarProductos = useCallback(async (q: string) => {
    setCargandoProductos(true);
    try {
      const params: Record<string, string> = { limit: '60', esServicio: 'false' };
      if (q) params.busqueda = q;
      const r = await api.get('/productos', { params });
      setProductos(r.data.data || []);
    } finally {
      setCargandoProductos(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => cargarProductos(busquedaProducto), 300);
    return () => clearTimeout(timer);
  }, [busquedaProducto, cargarProductos]);

  // Cargar historial de compras
  const cargarCompras = useCallback(async () => {
    setCargandoCompras(true);
    try {
      const params: any = { page: paginaActual, limit: 20 };
      if (proveedorFiltro) params.proveedorId = proveedorFiltro;
      if (fechaDesde) params.desde = format(fechaDesde, 'yyyy-MM-dd');
      if (fechaHasta) params.hasta = format(fechaHasta, 'yyyy-MM-dd');

      const response = await listarCompras(params);
      setCompras(response.data || []);
      setTotalCompras(response.total || 0);
    } finally {
      setCargandoCompras(false);
    }
  }, [paginaActual, proveedorFiltro, fechaDesde, fechaHasta]);

  useEffect(() => {
    if (vista === 'historial') {
      cargarCompras();
    }
  }, [vista, cargarCompras]);

  // Agregar producto a la compra
  const agregarProducto = (p: Producto) => {
    const existente = detalles.find((d) => d.producto.id === p.id);
    if (existente) {
      // Si ya existe, aumentar cantidad
      const nuevoItem = { ...existente, cantidad: existente.cantidad + 1 };
      setDetalles(detalles.map((d) =>
        d.producto.id === p.id ? nuevoItem : d
      ));
    } else {
      // Nuevo producto
      const nuevoItem: ItemCompra = {
        producto: p,
        cantidad: 1,
        // Usar último costo de compra si está disponible, sino el CPP
        costoUnitario: p.ultimoCostoCompra || Number.parseFloat(p.precioCompra.toString()) || 0,
        numerosSerie: [],
      };
      setDetalles([...detalles, nuevoItem]);
    }
    setBusquedaProducto('');
  };

  // Abrir modal de series manualmente
  const abrirModalSeries = (item: ItemCompra) => {
    setProductoSerieActual(item);
    setSeriesModalOpen(true);
  };

  // Actualizar cantidad
  const actualizarCantidad = (productoId: string, cantidad: number) => {
    if (cantidad <= 0) {
      setDetalles(detalles.filter((d) => d.producto.id !== productoId));
    } else {
      const item = detalles.find((d) => d.producto.id === productoId);
      if (item) {
        const nuevoItem = { ...item, cantidad };
        setDetalles(detalles.map((d) =>
          d.producto.id === productoId ? nuevoItem : d
        ));
        
        // Si requiere serie y se aumentó la cantidad, abrir modal
        if (item.producto.requiereSerie && cantidad > (item.numerosSerie?.length || 0)) {
          setProductoSerieActual(nuevoItem);
          setSeriesModalOpen(true);
        }
      }
    }
  };

  // Actualizar costo
  const actualizarCosto = (productoId: string, costo: number) => {
    setDetalles(detalles.map((d) =>
      d.producto.id === productoId ? { ...d, costoUnitario: costo } : d
    ));
  };

  // Eliminar producto
  const eliminarProducto = (productoId: string) => {
    setDetalles(detalles.filter((d) => d.producto.id !== productoId));
  };

  // Calcular total
  const calcularTotal = () => {
    return detalles.reduce((sum, d) => sum + d.cantidad * d.costoUnitario, 0);
  };

  // Manejar series completas (FASE 3)
  const handleSeriesCompletas = (series: string[]) => {
    if (productoSerieActual) {
      setDetalles(detalles.map((d) =>
        d.producto.id === productoSerieActual.producto.id
          ? { ...d, numerosSerie: series }
          : d
      ));
    }
    setSeriesModalOpen(false);
    setProductoSerieActual(null);
  };

  // Finalizar compra
  const finalizarCompra = async () => {
    setError(null);

    // Validaciones
    if (!proveedorId) {
      setError('Debe seleccionar un proveedor');
      return;
    }
    if (!numeroFactura.trim()) {
      setError('Debe ingresar el número de factura');
      return;
    }
    if (detalles.length === 0) {
      setError('Debe agregar al menos un producto');
      return;
    }

    // Validar cantidades y costos
    for (const d of detalles) {
      if (d.cantidad <= 0) {
        setError(`Cantidad inválida para ${d.producto.nombre}`);
        return;
      }
      if (d.costoUnitario <= 0) {
        setError(`Costo unitario inválido para ${d.producto.nombre}`);
        return;
      }
      // FASE 3: Validar que productos con serie tengan sus números escaneados
      if (d.producto.requiereSerie) {
        if (!d.numerosSerie || d.numerosSerie.length !== d.cantidad) {
          setError(
            `Debe escanear ${d.cantidad} número(s) de serie para ${d.producto.nombre} (escaneados: ${d.numerosSerie?.length || 0})`
          );
          return;
        }
      }
    }

    setProcesando(true);
    try {
      const dto: {
        proveedorId: string;
        numeroFactura: string;
        detalles: CrearDetalleCompraDto[];
        totalCompra?: number;
      } = {
        proveedorId,
        numeroFactura: numeroFactura.trim(),
        detalles: detalles.map((d) => ({
          productoId: d.producto.id,
          cantidad: d.cantidad,
          costoUnitario: d.costoUnitario,
          numerosSerie: d.numerosSerie, // FASE 3: Incluir números de serie
        })),
        totalCompra: calcularTotal(),
      };

      const resultado = await crearCompra(dto);
      
      // Verificar si hay sugerencias de precio
      if (resultado.sugerenciasPrecio && resultado.sugerenciasPrecio.length > 0) {
        setSugerenciasPrecio(resultado.sugerenciasPrecio);
        setModalSugerenciasOpen(true);
      }
      
      toast({
        title: 'Compra registrada',
        description: `Factura ${numeroFactura} guardada exitosamente`,
      });

      // Limpiar formulario
      setProveedorId('');
      setNumeroFactura('');
      setDetalles([]);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrar la compra');
    } finally {
      setProcesando(false);
    }
  };

  // Anular compra
  const handleAnular = async (id: string) => {
    try {
      await anularCompra(id);
      toast({
        title: 'Compra anulada exitosamente',
        description: 'El número de factura está disponible para reingreso',
      });
      setConfirmAnularId(null);
      cargarCompras();
    } catch (err: any) {
      toast({
        title: 'Error al anular',
        description: err.response?.data?.error || 'Error desconocido',
        variant: 'destructive',
      });
    }
  };

  // Crear producto rápido
  const handleCrearProductoRapido = async () => {
    if (!nuevoProducto.nombre.trim()) {
      toast({ title: 'El nombre del producto es obligatorio', variant: 'destructive' });
      return;
    }
    if (!nuevoProducto.categoriaId) {
      toast({ title: 'Debe seleccionar una categoría', variant: 'destructive' });
      return;
    }
    if (!nuevoProducto.ubicacionId) {
      toast({ title: 'Debe seleccionar una ubicación', variant: 'destructive' });
      return;
    }

    // Usar valores mínimos temporales (se actualizarán con la compra)
    const stockMinimo = Number.parseInt(nuevoProducto.stockMinimo || '1');
    const garantiaProveedor = nuevoProducto.garantiaProveedorMeses ? Number.parseInt(nuevoProducto.garantiaProveedorMeses) : undefined;
    const garantiaCliente = nuevoProducto.garantiaClienteMeses ? Number.parseInt(nuevoProducto.garantiaClienteMeses) : undefined;

    setCreandoProducto(true);
    try {
      const productoCreado = await productoService.createRapido({
        nombre: nuevoProducto.nombre,
        categoriaId: nuevoProducto.categoriaId,
        ubicacionId: nuevoProducto.ubicacionId,
        marca: nuevoProducto.marca || undefined,
        modelo: nuevoProducto.modelo || undefined,
        precioCompra: 0, // Se definirá con la compra
        precioVenta: 0, // Se calculará automáticamente en la primera compra
        stockActual: 0, // Stock inicial en 0 porque se añadirá con la compra
        stockMinimo,
        esServicio: false,
        requiereSerie: nuevoProducto.requiereSerie,
        garantiaProveedorMeses: garantiaProveedor,
        garantiaClienteMeses: garantiaCliente,
      });

      toast({
        title: 'Producto creado',
        description: `${productoCreado.nombre} se agregó exitosamente. Defina los precios en Inventario después.`,
      });

      // Agregar directamente al carrito de compra con costo por defecto
      setDetalles([
        ...detalles,
        {
          producto: productoCreado,
          cantidad: 1,
          costoUnitario: 0, // El usuario deberá ingresar el costo en el detalle
        },
      ]);

      // Limpiar formulario y cerrar
      setNuevoProducto({
        nombre: '',
        categoriaId: '',
        ubicacionId: ubicacionSinClasificar,
        marca: '',
        modelo: '',
        stockMinimo: '1',
        requiereSerie: false,
        garantiaProveedorMeses: '',
        garantiaClienteMeses: '',
      });
      setCrearProductoDialogOpen(false);

      // Recargar lista de productos
      cargarProductos(busquedaProducto);
    } catch (err: any) {
      toast({
        title: 'Error al crear producto',
        description: err.response?.data?.error || 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setCreandoProducto(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <Alert
            key={t.id}
            variant={t.variant}
            className="w-96 shadow-lg animate-in slide-in-from-top-5"
          >
            <AlertDescription>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{t.title}</div>
                  {t.description && <div className="text-sm mt-1">{t.description}</div>}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => dismiss(t.id)}
                >
                  ×
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Compras</h2>
          <p className="text-muted-foreground text-sm mt-1">Registre compras de mercadería y actualice inventario.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={vista === 'nueva' ? 'default' : 'outline'}
            onClick={() => setVista('nueva')}
            className="font-semibold"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva Compra
          </Button>
          <Button
            variant={vista === 'historial' ? 'default' : 'outline'}
            onClick={() => setVista('historial')}
            className="font-semibold"
          >
            <History className="mr-2 h-4 w-4" />
            Historial
          </Button>
        </div>
      </div>

      {/* Vista: Nueva Compra */}
      {vista === 'nueva' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
          {/* Panel izquierdo: Búsqueda y productos */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={busquedaProducto}
                  onChange={(e) => setBusquedaProducto(e.target.value)}
                  placeholder="Buscar productos por nombre, marca, modelo..."
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setCrearProductoDialogOpen(true)}
                className="flex-shrink-0"
              >
                <PackagePlus className="mr-2 h-4 w-4" />
                Crear Producto
              </Button>
            </div>

            {/* Lista de productos */}
            <div className="flex-1 border rounded-lg bg-card overflow-auto p-4">
              {cargandoProductos ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : productos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Search className="h-12 w-12 mb-3 opacity-20" />
                  <p className="font-medium">No se encontraron productos</p>
                  <p className="text-sm">Intente con otro término o cree un producto nuevo</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {productos.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => agregarProducto(p)}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{p.nombre}</div>
                        <div className="text-xs text-muted-foreground">{[p.marca, p.modelo].filter(Boolean).join(' · ')|| '—'}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="text-sm font-semibold text-primary">
                            {fmt(p.ultimoCostoCompra || Number.parseFloat(p.precioCompra.toString()))}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {p.ultimoCostoCompra ? 'Última compra' : 'CPP'}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Stock: {p.stockActual}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Panel derecho: Detalles de compra */}
          <div className="flex flex-col gap-4 border rounded-lg bg-card p-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Proveedor *</label>
                <Select value={proveedorId} onValueChange={setProveedorId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccione proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {proveedores.map((prov) => (
                      <SelectItem key={prov.id} value={prov.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {prov.nombreEmpresa}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Número de Factura *</label>
                <Input
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  placeholder="Ej: F001-00001234"
                />
              </div>
            </div>

            <div className="border-t pt-3 flex-1 flex flex-col overflow-hidden">
              <h3 className="text-sm font-semibold mb-3">Detalle de la Compra</h3>
              {detalles.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>Agregue productos desde la búsqueda</p>
                </div>
              ) : (
                <div className="space-y-2 flex-1 overflow-auto pr-2">
                  {detalles.map((d) => {
                    const seriesCompletas = d.producto.requiereSerie && d.numerosSerie && d.numerosSerie.length === d.cantidad;
                    const seriesFaltantes = d.producto.requiereSerie ? d.cantidad - (d.numerosSerie?.length || 0) : 0;
                    
                    return (
                      <div key={d.producto.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-sm">{d.producto.nombre}</div>
                              {d.producto.requiereSerie && (
                                seriesCompletas ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    ✓ Series OK
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => abrirModalSeries(d)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 hover:bg-orange-200 transition-colors"
                                  >
                                    ⚠ Faltan {seriesFaltantes} {seriesFaltantes === 1 ? 'serie' : 'series'}
                                  </button>
                                )
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">{[d.producto.marca, d.producto.modelo].filter(Boolean).join(' · ')|| '—'}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => eliminarProducto(d.producto.id)}
                            className="h-6 w-6 p-0 flex-shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Cantidad</label>
                          <Input
                            type="text"
                            value={d.cantidad}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Permitir solo números enteros
                              if (/^\d*$/.test(value) || value === '') {
                                actualizarCantidad(d.producto.id, Number.parseInt(value) || 0);
                              }
                            }}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Costo Unit.</label>
                          <Input
                            type="text"
                            value={d.costoUnitario}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Permitir solo números y un punto decimal con máximo 2 decimales
                              if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
                                actualizarCosto(d.producto.id, Number.parseFloat(value) || 0);
                              }
                            }}
                            className="h-8"
                          />
                        </div>
                      </div>
                        <div className="text-right text-sm font-semibold text-primary">
                          Subtotal: {fmt(d.cantidad * d.costoUnitario)}
                        </div>
                        
                        {/* Indicador de series faltantes */}
                        {d.producto.requiereSerie && (
                          <div className="mt-2 pt-2 border-t flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant={(d.numerosSerie?.length ?? 0) === d.cantidad ? "default" : "destructive"} className="text-xs">
                                {(d.numerosSerie?.length ?? 0) === d.cantidad
                                  ? "✓ Series completas"
                                  : `⚠ Faltan ${d.cantidad - (d.numerosSerie?.length ?? 0)} series`}
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => abrirModalSeries(d)}
                              className="h-7 text-xs"
                            >
                              <QrCode className="h-3 w-3 mr-1" />
                              Escanear Series
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t pt-3 mt-auto">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-bold">Total:</span>
                <span className="text-2xl font-bold text-primary">{fmt(calcularTotal())}</span>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-3">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={finalizarCompra}
                disabled={procesando || detalles.length === 0}
                className="w-full font-bold"
                size="lg"
              >
                {procesando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Receipt className="mr-2 h-4 w-4" />
                    Finalizar Compra
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Vista: Historial */}
      {vista === 'historial' && (
        <div className="flex flex-col gap-4 h-full">
          {/* Filtros */}
          <div className="flex flex-wrap gap-3">
            <Select value={proveedorFiltro} onValueChange={setProveedorFiltro}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Todos los proveedores" />
              </SelectTrigger>
              <SelectContent>
                {proveedores.map((prov) => (
                  <SelectItem key={prov.id} value={prov.id}>
                    {prov.nombreEmpresa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-48">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fechaDesde ? format(fechaDesde, 'PPP', { locale: es }) : 'Desde'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={fechaDesde}
                  onSelect={setFechaDesde}
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

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-48">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fechaHasta ? format(fechaHasta, 'PPP', { locale: es }) : 'Hasta'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={fechaHasta}
                  onSelect={setFechaHasta}
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

            <Button variant="outline" onClick={() => { setFechaDesde(undefined); setFechaHasta(undefined); setProveedorFiltro(''); }}>
              Limpiar Filtros
            </Button>

            <Badge variant="outline" className="h-10 px-4 flex items-center ml-auto">
              Total: {totalCompras}
            </Badge>
          </div>

          {/* Tabla de compras */}
          <div className="flex-1 border rounded-lg bg-card overflow-auto">
            {cargandoCompras ? (
              <div className="flex items-center justify-center h-60">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : compras.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
                <FileText className="h-12 w-12 mb-3 opacity-20" />
                <p className="font-medium">No hay compras registradas</p>
                <p className="text-sm">Las compras aparecerán aquí</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Factura</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compras.map((compra) => (
                    <Fragment key={compra.id}>
                      <TableRow className={compra.deletedAt !== null ? 'opacity-50' : ''}>
                        <TableCell className="text-sm">
                          {format(new Date(compra.createdAt), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {compra.numeroFactura}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {compra.proveedor?.nombreEmpresa}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {compra._count?.detalles || 0} items
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-primary">
                          {fmt(Number.parseFloat(compra.totalCompra.toString()))}
                        </TableCell>
                        <TableCell className="text-sm">
                          {compra.usuario?.nombreCompleto}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setExpandida(expandida === compra.id ? null : compra.id)
                              }
                            >
                              {expandida === compra.id ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                            {!compra.deletedAt && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setConfirmAnularId(compra.id);
                                  setConfirmAnularNumero(compra.numeroFactura);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            {compra.deletedAt && (
                              <Badge variant="destructive">ANULADA</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandida === compra.id && compra.detalles && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/50">
                            <div className="p-4">
                              <h4 className="font-semibold mb-3">Detalles de la Compra</h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Cantidad</TableHead>
                                    <TableHead>Costo Unit.</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {compra.detalles.map((detalle) => (
                                    <TableRow key={detalle.id}>
                                      <TableCell>{detalle.producto?.nombre}</TableCell>
                                      <TableCell>{detalle.cantidad}</TableCell>
                                      <TableCell>
                                      {fmt(Number.parseFloat(detalle.costoUnitario.toString()))}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {fmt(
                                        detalle.cantidad *
                                          Number.parseFloat(detalle.costoUnitario.toString())
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Paginación */}
          {totalCompras > 20 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPaginaActual(Math.max(1, paginaActual - 1))}
                disabled={paginaActual === 1}
              >
                Anterior
              </Button>
              <Badge variant="outline" className="h-10 px-4 flex items-center">
                Página {paginaActual} de {Math.ceil(totalCompras / 20)}
              </Badge>
              <Button
                variant="outline"
                onClick={() => setPaginaActual(paginaActual + 1)}
                disabled={paginaActual >= Math.ceil(totalCompras / 20)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Dialog: Confirmación de Anulación */}
      <Dialog open={confirmAnularId !== null} onOpenChange={(open) => !open && setConfirmAnularId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Anular Compra?</DialogTitle>
            <DialogDescription>
              Esta acción marcará la compra como anulada pero <strong>NO revertirá el stock</strong> automáticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert>
              <AlertDescription>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Factura:</strong> {confirmAnularNumero}
                  </p>
                  <p className="text-muted-foreground">
                    Después de anular, el número de factura quedará disponible para reingreso.
                  </p>
                  <p className="text-yellow-600 dark:text-yellow-500 font-medium">
                    ⚠️ Recuerde: El stock NO se revertirá automáticamente. Si es necesario, ajústelo manualmente en el módulo de Productos.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmAnularId(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmAnularId && handleAnular(confirmAnularId)}
            >
              Confirmar Anulación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Crear Producto Rápido */}
      <Dialog open={crearProductoDialogOpen} onOpenChange={setCrearProductoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Producto Rápido</DialogTitle>
            <DialogDescription>
              Cree un producto con datos básicos. Los precios se definirán al registrar la compra.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nombre del Producto <span className="text-destructive">*</span>
              </label>
              <Input
                value={nuevoProducto.nombre}
                onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
                placeholder="Ej: Teclado Mecánico RGB"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Marca</label>
                <Input
                  value={nuevoProducto.marca}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, marca: e.target.value })}
                  placeholder="Ej: Logitech"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Modelo</label>
                <Input
                  value={nuevoProducto.modelo}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, modelo: e.target.value })}
                  placeholder="Ej: G512"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Categoría <span className="text-destructive">*</span>
              </label>
              <Select
                value={nuevoProducto.categoriaId}
                onValueChange={(value) => setNuevoProducto({ ...nuevoProducto, categoriaId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Ubicación <span className="text-destructive">*</span>
              </label>
              <Select
                value={nuevoProducto.ubicacionId}
                onValueChange={(value) => setNuevoProducto({ ...nuevoProducto, ubicacionId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione ubicación" />
                </SelectTrigger>
                <SelectContent>
                  {ubicaciones.map((ubi) => (
                    <SelectItem key={ubi.id} value={ubi.id}>
                      {ubi.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Stock Mínimo</label>
              <Input
                type="text"
                value={nuevoProducto.stockMinimo}
                onChange={(e) => {
                  const value = e.target.value;
                  // Permitir solo números enteros
                  if (/^\d*$/.test(value) || value === '') {
                    setNuevoProducto({ ...nuevoProducto, stockMinimo: value });
                  }
                }}
                placeholder="1"
              />
            </div>
            
            {/* Campos de series y garantía */}
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="requiereSerie"
                  checked={nuevoProducto.requiereSerie}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, requiereSerie: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="requiereSerie" className="text-sm font-medium cursor-pointer">
                  ¿Requiere Número de Serie?
                </label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Garantía Proveedor (meses)</label>
                  <Input
                    type="text"
                    value={nuevoProducto.garantiaProveedorMeses}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*$/.test(value) || value === '') {
                        setNuevoProducto({ ...nuevoProducto, garantiaProveedorMeses: value });
                      }
                    }}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Garantía Cliente (meses)</label>
                  <Input
                    type="text"
                    value={nuevoProducto.garantiaClienteMeses}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*$/.test(value) || value === '') {
                        setNuevoProducto({ ...nuevoProducto, garantiaClienteMeses: value });
                      }
                    }}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <Alert>
              <AlertDescription className="text-xs">
                <strong>Nota:</strong> El producto se agregará al detalle de compra con stock 0. Ingrese el costo unitario y cantidad después de crearlo. Los precios se pueden ajustar luego en Inventario.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCrearProductoDialogOpen(false)}
              disabled={creandoProducto}
            >
              Cancelar
            </Button>
            <Button onClick={handleCrearProductoRapido} disabled={creandoProducto}>
              {creandoProducto && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear y Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Escaneo de Series (FASE 3) */}
      {productoSerieActual && (
        <SeriesEscanerModal
          isOpen={seriesModalOpen}
          onClose={() => {
            setSeriesModalOpen(false);
            setProductoSerieActual(null);
          }}
          productoNombre={`${productoSerieActual.producto.nombre}${productoSerieActual.producto.marca ? ` - ${productoSerieActual.producto.marca}` : ''}`}
          cantidad={productoSerieActual.cantidad}
          onSeriesCompletas={handleSeriesCompletas}
          modo="compra"
        />
      )}

      {/* Modal de Sugerencias de Precios */}
      <SugerenciasPrecioModal
        open={modalSugerenciasOpen}
        onOpenChange={setModalSugerenciasOpen}
        sugerencias={sugerenciasPrecio}
        onAplicar={async (sugerenciasSeleccionadas) => {
          try {
            const actualizaciones = sugerenciasSeleccionadas.map(s => ({
              id: s.productoId,
              precioVenta: s.precioEditado || s.precioSugerido,
            }));
            
            await productoService.actualizarPreciosMasivo(actualizaciones);
            
            toast({
              title: 'Precios actualizados',
              description: `${actualizaciones.length} producto(s) actualizado(s) exitosamente`,
            });
          } catch (error) {
            toast({
              title: 'Error al actualizar precios',
              description: 'Ocurrió un error al aplicar los cambios',
              variant: 'destructive',
            });
          }
        }}
      />
    </div>
  );
}
