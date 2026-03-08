import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { EstadoBadge } from '@/components/EstadoBadge';
import { Pagination } from '@/components/Pagination';
import {
  Plus,
  Loader2,
  Search,
  Wrench,
  Trash2,
  ExternalLink,
  RotateCcw,
  User,
  Laptop,
  Calendar as CalendarIcon,
  UserPlus,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import { useOrdenesServicio } from '@/hooks/useOrdenesServicio';
import { clienteService } from '@/services/cliente.service';
import { equipoClienteService } from '@/services/equipo-cliente.service';
import { usuarioService } from '@/services/usuario.service';
import type {
  Cliente,
  EquipoCliente,
  Usuario,
  EstadoOrden,
  CrearOrdenDto,
  CrearEquipoDto,
  EquipoOrdenInputDto,
} from '@/types';

// Constantes
const ESTADOS: { value: EstadoOrden | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'RECIBIDA', label: 'Recibida' },
  { value: 'EN_REPARACION', label: 'En Reparación' },
  { value: 'LISTA', label: 'Lista' },
  { value: 'ENTREGADA', label: 'Entregada' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

const EQUIPO_ENTRADA_VACIO = {
  equipoId: '',
  problemaReportado: '',
  diagnosticoTecnico: '',
  costoEstimado: '',
};

const EQUIPO_NUEVO_VACIO: CrearEquipoDto = {
  tipoEquipo: '',
  marca: '',
  modelo: '',
  numeroSerie: '',
  contrasenaPatron: '',
};

const formatMoneda = (valor: string | null | undefined) => {
  if (!valor) return 'S/ 0.00';
  return `S/ ${parseFloat(valor).toFixed(2)}`;
};

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });

// Componente
export function OrdenesServicioPage() {
  const navigate = useNavigate();
  const {
    ordenes,
    total,
    loading,
    error,
    filtros,
    aplicarFiltros,
    limpiarFiltros,
    cambiarPagina,
    createOrden,
    deleteOrden,
  } = useOrdenesServicio();

  // Filtros
  const [busquedaLocal, setBusquedaLocal] = useState('');
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>(undefined);
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>(undefined);
  const busquedaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBusquedaChange = (valor: string) => {
    setBusquedaLocal(valor);
    if (busquedaTimer.current) clearTimeout(busquedaTimer.current);
    busquedaTimer.current = setTimeout(() => aplicarFiltros({ busqueda: valor }), 400);
  };

  // Estado Sheet "Nueva Orden"
  const [sheetOpen, setSheetOpen] = useState(false);
  const [clienteId, setClienteId] = useState('');
  const [usuarioTecnicoId, setUsuarioTecnicoId] = useState<string | null>(null);
  const [pagoACuenta, setPagoACuenta] = useState<number>(0);
  const [equiposEnOrden, setEquiposEnOrden] = useState<EquipoOrdenInputDto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSearch, setClienteSearch] = useState('');
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  // Estado Dialog "Nuevo Cliente"
  const [nuevoClienteDialogOpen, setNuevoClienteDialogOpen] = useState(false);
  const [formNuevoCliente, setFormNuevoCliente] = useState({ nombre: '', telefono: '' });
  const [submittingNuevoCliente, setSubmittingNuevoCliente] = useState(false);
  const [errorNuevoCliente, setErrorNuevoCliente] = useState<string | null>(null);

  // Estado Dialog "Agregar Equipo a la Orden"
  const [agregarEquipoDialogOpen, setAgregarEquipoDialogOpen] = useState(false);
  const [equipos, setEquipos] = useState<EquipoCliente[]>([]);
  const [loadingEquipos, setLoadingEquipos] = useState(false);
  const [equipoEntrada, setEquipoEntrada] = useState({ ...EQUIPO_ENTRADA_VACIO });
  const [entradaError, setEntradaError] = useState<string | null>(null);

  // Mini-form crear nuevo equipo (dentro del dialog de agregar equipo)
  const [mostrarFormEquipo, setMostrarFormEquipo] = useState(false);
  const [formNuevoEquipo, setFormNuevoEquipo] = useState<CrearEquipoDto>({ ...EQUIPO_NUEVO_VACIO });
  const [submittingNuevoEquipo, setSubmittingNuevoEquipo] = useState(false);
  const [errorNuevoEquipo, setErrorNuevoEquipo] = useState<string | null>(null);
  const [verContrasenaEquipo, setVerContrasenaEquipo] = useState(false);

  // Carga inicial del formulario
  const cargarDatosFormulario = useCallback(async () => {
    setLoadingClientes(true);
    try {
      const [{ clientes: cs }, us] = await Promise.all([
        clienteService.getAll({ limit: 500 }),
        usuarioService.getAll(),
      ]);
      setClientes(cs);
      setUsuarios(us);
    } catch { /* silencioso */ }
    finally { setLoadingClientes(false); }
  }, []);

  const handleAbrirSheet = () => {
    setClienteId('');
    setUsuarioTecnicoId(null);
    setPagoACuenta(0);
    setEquiposEnOrden([]);
    setClienteSearch('');
    setEquipos([]);
    setFormError(null);
    setSheetOpen(true);
    cargarDatosFormulario();
  };

  // Cambio de cliente
  const handleClienteChange = useCallback(async (id: string) => {
    setClienteId(id);
    setEquiposEnOrden([]);
    setEquipos([]);
    if (!id) return;
    setLoadingEquipos(true);
    try {
      const data = await equipoClienteService.getByCliente(id);
      setEquipos(data);
    } catch { /* silencioso */ }
    finally { setLoadingEquipos(false); }
  }, []);

  // Abrir dialog "Agregar Equipo"
  const handleAbrirAgregarEquipo = () => {
    setEquipoEntrada({ ...EQUIPO_ENTRADA_VACIO });
    setEntradaError(null);
    setMostrarFormEquipo(false);
    setFormNuevoEquipo({ ...EQUIPO_NUEVO_VACIO });
    setErrorNuevoEquipo(null);
    setVerContrasenaEquipo(false);
    setAgregarEquipoDialogOpen(true);
  };

  // Crear equipo nuevo desde el dialog
  const handleCrearEquipoInline = async () => {
    if (!clienteId) return;
    if (!formNuevoEquipo.tipoEquipo.trim()) {
      setErrorNuevoEquipo('El tipo de equipo es obligatorio.');
      return;
    }
    if (!formNuevoEquipo.marca?.trim()) {
      setErrorNuevoEquipo('La marca es obligatoria.');
      return;
    }
    if (!formNuevoEquipo.modelo?.trim()) {
      setErrorNuevoEquipo('El modelo es obligatorio.');
      return;
    }
    if (!formNuevoEquipo.numeroSerie?.trim()) {
      setErrorNuevoEquipo('El número de serie es obligatorio.');
      return;
    }
    setSubmittingNuevoEquipo(true);
    setErrorNuevoEquipo(null);
    try {
      const nuevoEquipo = await equipoClienteService.create(clienteId, {
        tipoEquipo: formNuevoEquipo.tipoEquipo.trim(),
        marca: formNuevoEquipo.marca?.trim() || null,
        modelo: formNuevoEquipo.modelo?.trim() || null,
        numeroSerie: formNuevoEquipo.numeroSerie?.trim() || null,
        contrasenaPatron: formNuevoEquipo.contrasenaPatron?.trim() || null,
      });
      setEquipos((prev) => [...prev, nuevoEquipo]);
      setEquipoEntrada((prev) => ({ ...prev, equipoId: nuevoEquipo.id }));
      setMostrarFormEquipo(false);
      setFormNuevoEquipo({ ...EQUIPO_NUEVO_VACIO });
      setVerContrasenaEquipo(false);
    } catch (err: any) {
      setErrorNuevoEquipo(err.response?.data?.error || 'Error al crear el equipo');
    } finally {
      setSubmittingNuevoEquipo(false);
    }
  };

  // Confirmar "Agregar a la Orden"
  const handleConfirmarAgregarEquipo = () => {
    if (!equipoEntrada.equipoId) {
      setEntradaError('Debe seleccionar un equipo.');
      return;
    }
    if (!equipoEntrada.problemaReportado.trim()) {
      setEntradaError('El problema reportado es obligatorio.');
      return;
    }
    const nuevo: EquipoOrdenInputDto = {
      equipoId: equipoEntrada.equipoId,
      problemaReportado: equipoEntrada.problemaReportado.trim(),
      diagnosticoTecnico: equipoEntrada.diagnosticoTecnico.trim() || null,
      costoEstimado: equipoEntrada.costoEstimado ? parseFloat(equipoEntrada.costoEstimado) : null,
    };
    setEquiposEnOrden((prev) => [...prev, nuevo]);
    setAgregarEquipoDialogOpen(false);
  };

  // Quitar equipo de la lista
  const handleQuitarEquipo = (index: number) => {
    setEquiposEnOrden((prev) => prev.filter((_, i) => i !== index));
  };

  // Crear cliente rapido
  const handleCrearClienteRapido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNuevoCliente.nombre.trim()) {
      setErrorNuevoCliente('El nombre es obligatorio.');
      return;
    }
    setSubmittingNuevoCliente(true);
    setErrorNuevoCliente(null);
    try {
      const nuevoCliente = await clienteService.create({
        nombre: formNuevoCliente.nombre.trim(),
        telefono: formNuevoCliente.telefono.trim() || null,
      });
      setClientes((prev) => [nuevoCliente, ...prev]);
      await handleClienteChange(nuevoCliente.id);
      setNuevoClienteDialogOpen(false);
      setFormNuevoCliente({ nombre: '', telefono: '' });
    } catch (err: any) {
      setErrorNuevoCliente(err.response?.data?.error || 'Error al crear el cliente');
    } finally {
      setSubmittingNuevoCliente(false);
    }
  };

  // Submit principal
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId) {
      setFormError('Debe seleccionar un cliente.');
      return;
    }
    if (equiposEnOrden.length === 0) {
      setFormError('Debe agregar al menos un equipo a la orden.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const payload: CrearOrdenDto = {
        clienteId,
        usuarioTecnicoId: usuarioTecnicoId || null,
        pagoACuenta: pagoACuenta || 0,
        equipos: equiposEnOrden,
      };
      const orden = await createOrden(payload);
      setSheetOpen(false);
      navigate(`/ordenes-servicio/${orden.id}`);
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Error al crear la orden');
    } finally {
      setSubmitting(false);
    }
  };

  // Eliminacion
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleEliminar = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteOrden(id);
      setDeleteConfirmId(null);
    } catch { /* silencioso */ }
    finally { setDeletingId(null); }
  };

  // Derivados
  const clientesFiltrados = clientes.filter(
    (c) =>
      !clienteSearch ||
      c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
      (c.dniRuc && c.dniRuc.includes(clienteSearch)) ||
      (c.telefono && c.telefono.includes(clienteSearch))
  );
  const clienteSeleccionado = clientes.find((c) => c.id === clienteId);
  const equipoSeleccionadoObj = equipos.find((e) => e.id === equipoEntrada.equipoId);
  const idsEnOrden = new Set(equiposEnOrden.map((e) => e.equipoId));
  const equiposDisponibles = equipos.filter((eq) => !idsEnOrden.has(eq.id));

  // Render
  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Ordenes de Servicio
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gestione las reparaciones y servicios tecnicos.
          </p>
        </div>
        <Button onClick={handleAbrirSheet} className="font-bold shadow-sm">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Orden
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={busquedaLocal}
            onChange={(e) => handleBusquedaChange(e.target.value)}
            placeholder="Buscar por codigo o cliente..."
            className="pl-9"
          />
        </div>

        <Select
          value={filtros.estado || '__all__'}
          onValueChange={(v) =>
            aplicarFiltros({ estado: v === '__all__' ? '' : (v as EstadoOrden) })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {ESTADOS.map((e) => (
              <SelectItem key={e.value || 'todos'} value={e.value || '__all__'}>
                {e.label}
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
              onSelect={(date) => {
                setFechaDesde(date);
                aplicarFiltros({ desde: date ? format(date, 'yyyy-MM-dd') : '' });
              }}
              locale={es}
              disabled={(date) => {
                if (date > new Date()) return true;
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
              onSelect={(date) => {
                setFechaHasta(date);
                aplicarFiltros({ hasta: date ? format(date, 'yyyy-MM-dd') : '' });
              }}
              locale={es}
              disabled={(date) => {
                if (date > new Date()) return true;
                if (fechaDesde && date < fechaDesde) return true;
                return false;
              }}
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          className="h-9 text-sm"
          onClick={() => {
            setFechaDesde(undefined);
            setFechaHasta(undefined);
            limpiarFiltros();
          }}
          title="Limpiar filtros"
        >
          <X className="h-4 w-4 mr-1" />
          Limpiar
        </Button>
        <Badge variant="outline" className="h-9 px-4 flex items-center">
          Total: {total}
        </Badge>
      </div>

      {/* Error global */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabla */}
      <div className="flex-1 border rounded-lg bg-card overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center h-60">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : ordenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
            <Wrench className="h-12 w-12 mb-3 opacity-20" />
            <p className="font-medium">No hay ordenes de servicio</p>
            <p className="text-sm">Crea una nueva orden para comenzar</p>
          </div>
        ) : (
          <>
            <div className="overflow-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Codigo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Equipos</TableHead>
                    <TableHead className="w-36">Estado</TableHead>
                    <TableHead>Tecnico</TableHead>
                    <TableHead className="w-24">Fecha</TableHead>
                    <TableHead className="w-28 text-right">Total</TableHead>
                    <TableHead className="text-right w-32">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordenes.map((orden) => {
                    const primerEquipo = orden.equipos?.[0]?.equipo;
                    const totalEquipos = orden._count?.equipos ?? orden.equipos?.length ?? 0;
                    return (
                      <TableRow
                        key={orden.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/ordenes-servicio/${orden.id}`)}
                      >
                        <TableCell>
                          <span className="font-mono text-xs font-semibold text-primary">
                            {orden.codigoFormateado}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{orden.cliente.nombre}</span>
                            {orden.cliente.telefono && (
                              <span className="text-xs text-muted-foreground">{orden.cliente.telefono}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            {primerEquipo ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">{primerEquipo.tipoEquipo}</span>
                                {(primerEquipo.marca || primerEquipo.modelo) && (
                                  <span className="text-xs text-muted-foreground">
                                    {[primerEquipo.marca, primerEquipo.modelo].filter(Boolean).join(' ')}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Sin equipos</span>
                            )}
                            {totalEquipos > 1 && (
                              <span className="text-xs text-muted-foreground">+{totalEquipos - 1} mas</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <EstadoBadge estado={orden.estado} />
                        </TableCell>
                        <TableCell>
                          {orden.usuarioTecnico ? (
                            <div className="flex items-center gap-1.5 text-sm">
                              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[120px]">
                                {orden.usuarioTecnico.nombreCompleto}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Sin asignar</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatFecha(orden.fechaEmision)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-sm">
                          {formatMoneda(orden.total)}
                        </TableCell>
                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {deleteConfirmId === orden.id ? (
                            <div className="flex gap-1.5 justify-end">
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs"
                                onClick={() => handleEliminar(orden.id)}
                                disabled={deletingId === orden.id}
                              >
                                {deletingId === orden.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  'Confirmar'
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => setDeleteConfirmId(null)}
                              >
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => navigate(`/ordenes-servicio/${orden.id}`)}
                                title="Ver detalle"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                              {(orden.estado === 'RECIBIDA' || orden.estado === 'CANCELADA') && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 hover:text-destructive"
                                  onClick={() => setDeleteConfirmId(orden.id)}
                                  title="Eliminar orden"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <Pagination
              currentPage={filtros.page}
              totalItems={total}
              itemsPerPage={filtros.limit}
              onPageChange={cambiarPagina}
              onItemsPerPageChange={(limit) => aplicarFiltros({ limit, page: 1 })}
            />
          </>
        )}
      </div>

      {/* Sheet: Nueva Orden */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="border-b pb-4">
            <SheetTitle className="text-xl font-bold">Nueva Orden de Servicio</SheetTitle>
            <SheetDescription>
              Los campos con <span className="text-destructive">*</span> son obligatorios.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-6">
            {/* Seleccionar cliente */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center justify-between">
                <span>
                  Cliente <span className="text-destructive">*</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 text-xs text-primary hover:text-primary px-2"
                  onClick={() => {
                    setFormNuevoCliente({ nombre: '', telefono: '' });
                    setErrorNuevoCliente(null);
                    setNuevoClienteDialogOpen(true);
                  }}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Nuevo cliente
                </Button>
              </label>
              {loadingClientes ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando clientes...
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={clienteSearch}
                      onChange={(e) => setClienteSearch(e.target.value)}
                      placeholder="Filtrar clientes..."
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                  <div className="border rounded-md overflow-hidden">
                    <div className="max-h-44 overflow-y-auto">
                      {clientesFiltrados.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          {clienteSearch ? 'Sin coincidencias' : 'No hay clientes'}
                        </p>
                      ) : (
                        clientesFiltrados.map((c) => (
                          <button
                            type="button"
                            key={c.id}
                            onClick={() => handleClienteChange(c.id)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors flex items-center justify-between gap-2 ${
                              clienteId === c.id ? 'bg-primary/10 text-primary font-medium' : ''
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5 shrink-0" />
                              {c.nombre}
                            </span>
                            {c.dniRuc && (
                              <span className="text-xs text-muted-foreground font-mono">{c.dniRuc}</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                  {clienteSeleccionado && (
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                      Cliente seleccionado: {clienteSeleccionado.nombre}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Lista de equipos en la orden */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                Equipos <span className="text-destructive">*</span>
                {equiposEnOrden.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {equiposEnOrden.length}
                  </Badge>
                )}
              </label>

              {equiposEnOrden.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  {clienteId
                    ? 'Aun no has agregado equipos. Usa el boton de abajo.'
                    : 'Primero selecciona un cliente.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {equiposEnOrden.map((item, index) => {
                    const equipo = equipos.find((e) => e.id === item.equipoId);
                    return (
                      <div
                        key={index}
                        className="border rounded-md px-3 py-2.5 bg-muted/20 flex items-start justify-between gap-2"
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <Laptop className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {equipo
                                ? [equipo.tipoEquipo, equipo.marca, equipo.modelo].filter(Boolean).join(' ')
                                : item.equipoId}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.problemaReportado}
                            </p>
                            {item.costoEstimado != null && (
                              <p className="text-xs text-muted-foreground">
                                Costo est.: S/ {Number(item.costoEstimado).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleQuitarEquipo(index)}
                          className="text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
                          title="Quitar equipo"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {clienteId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-xs h-8"
                  onClick={handleAbrirAgregarEquipo}
                  disabled={loadingEquipos}
                >
                  {loadingEquipos ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Agregar equipo
                </Button>
              )}
            </div>

            {/* Pago a cuenta */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Pago a cuenta (S/)</label>
              <Input
                type="text"
                min="0"
                step="0.01"
                value={pagoACuenta || ''}
                onChange={(e) => setPagoACuenta(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>

            {/* Tecnico asignado */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tecnico asignado</label>
              <Select
                value={usuarioTecnicoId || '__none__'}
                onValueChange={(v) => setUsuarioTecnicoId(v === '__none__' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin asignar</SelectItem>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nombreCompleto}
                      <span className="ml-2 text-xs text-muted-foreground">({u.rol})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSheetOpen(false)}
                disabled={submitting}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Orden
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Dialog: Agregar Equipo a la Orden */}
      <Dialog open={agregarEquipoDialogOpen} onOpenChange={setAgregarEquipoDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Agregar equipo a la orden</DialogTitle>
            <DialogDescription>
              Selecciona un equipo del cliente y describe el problema reportado.
            </DialogDescription>
          </DialogHeader>

          {/* Layout dos columnas */}
          <div className="grid grid-cols-2 gap-6 mt-2 overflow-hidden flex-1 min-h-0">

            {/* Columna izquierda: selección de equipo */}
            <div className="flex flex-col gap-3 overflow-hidden">
              <label className="text-sm font-medium shrink-0">
                Equipo <span className="text-destructive">*</span>
              </label>

              {/* Lista de equipos del cliente */}
              <div className="flex-1 overflow-y-auto min-h-0 border rounded-md">
                {equipos.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic p-3">
                    Este cliente aún no tiene equipos registrados.
                  </p>
                ) : equiposDisponibles.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic p-3">
                    Todos los equipos del cliente ya están en esta orden. Registra uno nuevo abajo.
                  </p>
                ) : (
                  equiposDisponibles.map((eq) => (
                    <button
                      type="button"
                      key={eq.id}
                      onClick={() => setEquipoEntrada((prev) => ({ ...prev, equipoId: eq.id }))}
                      className={`w-full text-left px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors flex items-start gap-2 border-b last:border-b-0 ${
                        equipoEntrada.equipoId === eq.id
                          ? 'bg-primary/10 text-primary font-medium'
                          : ''
                      }`}
                    >
                      <Laptop className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium">{eq.tipoEquipo}</span>
                        {(eq.marca || eq.modelo) && (
                          <span className="text-muted-foreground font-normal">
                            {' '}{[eq.marca, eq.modelo].filter(Boolean).join(' ')}
                          </span>
                        )}
                        {eq.numeroSerie && (
                          <p className="text-xs text-muted-foreground font-mono">S/N: {eq.numeroSerie}</p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Mini-form nuevo equipo — aparece debajo de la lista */}
              {!mostrarFormEquipo ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5 text-xs h-8"
                  onClick={() => setMostrarFormEquipo(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Registrar nuevo equipo
                </Button>
              ) : (
                <div className="border rounded-md p-3 space-y-3 bg-muted/20 shrink-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">Nuevo equipo</p>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setMostrarFormEquipo(false);
                        setFormNuevoEquipo({ ...EQUIPO_NUEVO_VACIO });
                        setErrorNuevoEquipo(null);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium">
                      Tipo de equipo <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={formNuevoEquipo.tipoEquipo}
                      onChange={(e) => setFormNuevoEquipo((p) => ({ ...p, tipoEquipo: e.target.value }))}
                      placeholder="Laptop, Celular, PC..."
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Marca <span className="text-destructive">*</span></label>
                      <Input
                        value={formNuevoEquipo.marca || ''}
                        onChange={(e) => setFormNuevoEquipo((p) => ({ ...p, marca: e.target.value }))}
                        placeholder="HP, Samsung..."
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Modelo <span className="text-destructive">*</span></label>
                      <Input
                        value={formNuevoEquipo.modelo || ''}
                        onChange={(e) => setFormNuevoEquipo((p) => ({ ...p, modelo: e.target.value }))}
                        placeholder="Pavilion, A15..."
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">N de serie <span className="text-destructive">*</span></label>
                      <Input
                        value={formNuevoEquipo.numeroSerie || ''}
                        onChange={(e) => setFormNuevoEquipo((p) => ({ ...p, numeroSerie: e.target.value }))}
                        placeholder="Requerido"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Clave / Patrón</label>
                      <div className="relative">
                        <Input
                          type={verContrasenaEquipo ? 'text' : 'password'}
                          value={formNuevoEquipo.contrasenaPatron || ''}
                          onChange={(e) => setFormNuevoEquipo((p) => ({ ...p, contrasenaPatron: e.target.value }))}
                          placeholder="Opcional"
                          className="h-8 text-xs pr-8"
                        />
                        <button
                          type="button"
                          onClick={() => setVerContrasenaEquipo((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {verContrasenaEquipo ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {errorNuevoEquipo && (
                    <Alert variant="destructive" className="py-2">
                      <AlertDescription className="text-xs">{errorNuevoEquipo}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={() => {
                        setMostrarFormEquipo(false);
                        setFormNuevoEquipo({ ...EQUIPO_NUEVO_VACIO });
                        setErrorNuevoEquipo(null);
                      }}
                      disabled={submittingNuevoEquipo}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={handleCrearEquipoInline}
                      disabled={submittingNuevoEquipo}
                    >
                      {submittingNuevoEquipo && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      Guardar equipo
                    </Button>
                  </div>
                </div>
              )}

              {/* Confirmación equipo seleccionado */}
              {equipoSeleccionadoObj && (
                <p className="text-xs text-green-600 dark:text-green-400 font-medium shrink-0">
                  ✓ {[equipoSeleccionadoObj.tipoEquipo, equipoSeleccionadoObj.marca, equipoSeleccionadoObj.modelo].filter(Boolean).join(' ')}
                </p>
              )}
            </div>

            {/* Columna derecha: descripción del caso */}
            <div className="flex flex-col gap-4 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Problema reportado <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={equipoEntrada.problemaReportado}
                  onChange={(e) => setEquipoEntrada((prev) => ({ ...prev, problemaReportado: e.target.value }))}
                  placeholder="Describir el problema que reporta el cliente..."
                  rows={5}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Diagnostico tecnico</label>
                <Textarea
                  value={equipoEntrada.diagnosticoTecnico}
                  onChange={(e) => setEquipoEntrada((prev) => ({ ...prev, diagnosticoTecnico: e.target.value }))}
                  placeholder="Diagnostico preliminar (opcional)..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Costo estimado (S/)</label>
                <Input
                  type="text"
                  min="0"
                  value={equipoEntrada.costoEstimado}
                  onChange={(e) => setEquipoEntrada((prev) => ({ ...prev, costoEstimado: e.target.value }))}
                  placeholder="0.00"
                />
              </div>

              {entradaError && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">{entradaError}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 mt-4 shrink-0 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAgregarEquipoDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirmarAgregarEquipo}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar a la Orden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nuevo Cliente Rapido */}
      <Dialog open={nuevoClienteDialogOpen} onOpenChange={setNuevoClienteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
            <DialogDescription>
              Registro rapido. Puede completar el perfil (DNI/RUC, direccion) despues en el modulo de Clientes.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCrearClienteRapido} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Nombre <span className="text-destructive">*</span>
              </label>
              <Input
                autoFocus
                value={formNuevoCliente.nombre}
                onChange={(e) => setFormNuevoCliente((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="Nombre completo o razon social"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Telefono</label>
              <Input
                type="tel"
                value={formNuevoCliente.telefono}
                onChange={(e) => setFormNuevoCliente((p) => ({ ...p, telefono: e.target.value }))}
                placeholder="9XXXXXXXX"
              />
            </div>
            {errorNuevoCliente && (
              <Alert variant="destructive">
                <AlertDescription className="text-sm">{errorNuevoCliente}</AlertDescription>
              </Alert>
            )}
            <DialogFooter className="gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNuevoClienteDialogOpen(false)}
                disabled={submittingNuevoCliente}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submittingNuevoCliente}>
                {submittingNuevoCliente && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar cliente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}