import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  CalendarDays,
} from 'lucide-react';
import { useOrdenesServicio } from '@/hooks/useOrdenesServicio';
import { clienteService } from '@/services/cliente.service';
import { equipoClienteService } from '@/services/equipo-cliente.service';
import { usuarioService } from '@/services/usuario.service';
import type { Cliente, EquipoCliente, Usuario, EstadoOrden, CrearOrdenDto } from '@/types';

// ── Constantes ────────────────────────────────────────────────────────────────
const ESTADOS: { value: EstadoOrden | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'RECIBIDA', label: 'Recibida' },
  { value: 'EN_REPARACION', label: 'En Reparación' },
  { value: 'LISTA', label: 'Lista' },
  { value: 'ENTREGADA', label: 'Entregada' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

const FORM_VACIO: CrearOrdenDto = {
  clienteId: '',
  equipoId: '',
  problemaReportado: '',
  diagnosticoInicial: '',
  costoEstimado: null,
  pagoACuenta: 0,
  usuarioTecnicoId: null,
};

const formatMoneda = (valor: string | null | undefined) => {
  if (!valor) return 'S/ 0.00';
  return `S/ ${parseFloat(valor).toFixed(2)}`;
};

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ── Componente ────────────────────────────────────────────────────────────────
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

  // ── Filtros ────────────────────────────────────────────────────────────────
  const [busquedaLocal, setBusquedaLocal] = useState('');
  const busquedaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBusquedaChange = (valor: string) => {
    setBusquedaLocal(valor);
    if (busquedaTimer.current) clearTimeout(busquedaTimer.current);
    busquedaTimer.current = setTimeout(() => aplicarFiltros({ busqueda: valor }), 400);
  };

  // ── Sheet de creación ──────────────────────────────────────────────────────
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<CrearOrdenDto>(FORM_VACIO);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Para el selector de cliente
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSearch, setClienteSearch] = useState('');
  const [loadingClientes, setLoadingClientes] = useState(false);

  // Para el selector de equipo
  const [equipos, setEquipos] = useState<EquipoCliente[]>([]);
  const [loadingEquipos, setLoadingEquipos] = useState(false);

  // Para el selector de técnico
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

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
    setForm(FORM_VACIO);
    setClienteSearch('');
    setEquipos([]);
    setFormError(null);
    setSheetOpen(true);
    cargarDatosFormulario();
  };

  // Cargar equipos cuando cambia el cliente
  const handleClienteChange = useCallback(async (clienteId: string) => {
    setForm((prev) => ({ ...prev, clienteId, equipoId: '' }));
    setEquipos([]);
    if (!clienteId) return;
    setLoadingEquipos(true);
    try {
      const data = await equipoClienteService.getByCliente(clienteId);
      setEquipos(data);
      // Autoselect si hay un único equipo
      if (data.length === 1) {
        setForm((prev) => ({ ...prev, equipoId: data[0].id }));
      }
    } catch { /* silencioso */ }
    finally { setLoadingEquipos(false); }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clienteId || !form.equipoId) {
      setFormError('Debe seleccionar un cliente y un equipo.');
      return;
    }
    if (!form.problemaReportado.trim()) {
      setFormError('El problema reportado es obligatorio.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const payload: CrearOrdenDto = {
        clienteId: form.clienteId,
        equipoId: form.equipoId,
        problemaReportado: form.problemaReportado.trim(),
        diagnosticoInicial: form.diagnosticoInicial?.trim() || null,
        costoEstimado: form.costoEstimado ? Number(form.costoEstimado) : null,
        pagoACuenta: form.pagoACuenta ? Number(form.pagoACuenta) : 0,
        usuarioTecnicoId: form.usuarioTecnicoId || null,
      };
      const orden = await createOrden(payload);
      setSheetOpen(false);
      // Navegar al detalle de la nueva orden
      navigate(`/ordenes-servicio/${orden.id}`);
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Error al crear la orden');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Eliminación ────────────────────────────────────────────────────────────
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleEliminar = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteOrden(id);
      setDeleteConfirmId(null);
    } catch (err: any) {
      // El error queda en el hook
    } finally {
      setDeletingId(null);
    }
  };

  // ── Clientes filtrados para el selector ───────────────────────────────────
  const clientesFiltrados = clientes.filter(
    (c) =>
      !clienteSearch ||
      c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
      (c.dniRuc && c.dniRuc.includes(clienteSearch)) ||
      (c.telefono && c.telefono.includes(clienteSearch))
  );

  const clienteSeleccionado = clientes.find((c) => c.id === form.clienteId);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Órdenes de Servicio
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gestione las reparaciones y servicios técnicos.
          </p>
        </div>
        <Button onClick={handleAbrirSheet} className="font-bold shadow-sm">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Orden
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={busquedaLocal}
            onChange={(e) => handleBusquedaChange(e.target.value)}
            placeholder="Buscar por código o cliente..."
            className="pl-9"
          />
        </div>

        {/* Estado */}
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

        {/* Fecha desde */}
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={filtros.desde}
            onChange={(e) => aplicarFiltros({ desde: e.target.value })}
            className="w-40"
            placeholder="Desde"
          />
        </div>

        {/* Fecha hasta */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">hasta</span>
          <Input
            type="date"
            value={filtros.hasta}
            onChange={(e) => aplicarFiltros({ hasta: e.target.value })}
            className="w-40"
            placeholder="Hasta"
          />
        </div>

        {/* Limpiar + total */}
        <Button variant="ghost" size="sm" onClick={limpiarFiltros} title="Limpiar filtros">
          <RotateCcw className="h-4 w-4" />
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
            <p className="font-medium">No hay órdenes de servicio</p>
            <p className="text-sm">Crea una nueva orden para comenzar</p>
          </div>
        ) : (
          <>
            <div className="overflow-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Código</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Equipo</TableHead>
                    <TableHead className="max-w-[200px]">Problema</TableHead>
                    <TableHead className="w-36">Estado</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead className="w-24">Fecha</TableHead>
                    <TableHead className="w-28 text-right">Total</TableHead>
                    <TableHead className="text-right w-32">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordenes.map((orden) => (
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
                        <div className="flex flex-col">
                          <span className="text-sm">{orden.equipo.tipoEquipo}</span>
                          {(orden.equipo.marca || orden.equipo.modelo) && (
                            <span className="text-xs text-muted-foreground">
                              {[orden.equipo.marca, orden.equipo.modelo].filter(Boolean).join(' ')}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-sm truncate" title={orden.problemaReportado}>
                          {orden.problemaReportado}
                        </p>
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
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginación */}
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

      {/* ── Sheet: Nueva Orden ───────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="border-b pb-4">
            <SheetTitle className="text-xl font-bold">Nueva Orden de Servicio</SheetTitle>
            <SheetDescription>
              Los campos con <span className="text-destructive">*</span> son obligatorios.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-6">
            {/* ── Seleccionar cliente ── */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Cliente <span className="text-destructive">*</span>
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
                              form.clienteId === c.id ? 'bg-primary/10 text-primary font-medium' : ''
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5 shrink-0" />
                              {c.nombre}
                            </span>
                            {c.dniRuc && (
                              <span className="text-xs text-muted-foreground font-mono">
                                {c.dniRuc}
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                  {clienteSeleccionado && (
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                      ✓ Cliente seleccionado: {clienteSeleccionado.nombre}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ── Seleccionar equipo ── */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Equipo <span className="text-destructive">*</span>
              </label>
              {!form.clienteId ? (
                <p className="text-xs text-muted-foreground italic">
                  Primero seleccione un cliente.
                </p>
              ) : loadingEquipos ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando equipos...
                </div>
              ) : equipos.length === 0 ? (
                <Alert>
                  <AlertDescription className="text-xs">
                    Este cliente no tiene equipos registrados. Puede registrar uno en la sección de
                    Clientes.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  {equipos.map((eq) => (
                    <button
                      type="button"
                      key={eq.id}
                      onClick={() => setForm((prev) => ({ ...prev, equipoId: eq.id }))}
                      className={`w-full text-left px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors flex items-start gap-2 border-b last:border-b-0 ${
                        form.equipoId === eq.id ? 'bg-primary/10 text-primary font-medium' : ''
                      }`}
                    >
                      <Laptop className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium">{eq.tipoEquipo}</span>
                        {(eq.marca || eq.modelo) && (
                          <span className="text-muted-foreground font-normal">
                            {' '}
                            — {[eq.marca, eq.modelo].filter(Boolean).join(' ')}
                          </span>
                        )}
                        {eq.numeroSerie && (
                          <p className="text-xs text-muted-foreground font-mono">
                            S/N: {eq.numeroSerie}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Problema reportado ── */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Problema reportado <span className="text-destructive">*</span>
              </label>
              <Textarea
                required
                value={form.problemaReportado}
                onChange={(e) => setForm({ ...form, problemaReportado: e.target.value })}
                placeholder="Describir el problema que reporta el cliente..."
                rows={3}
              />
            </div>

            {/* ── Diagnóstico inicial ── */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Diagnóstico inicial</label>
              <Textarea
                value={form.diagnosticoInicial || ''}
                onChange={(e) => setForm({ ...form, diagnosticoInicial: e.target.value })}
                placeholder="Diagnóstico preliminar (opcional)..."
                rows={2}
              />
            </div>

            {/* ── Costo estimado + pago a cuenta ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Costo estimado (S/)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.costoEstimado ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      costoEstimado: e.target.value === '' ? null : parseFloat(e.target.value),
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Pago a cuenta (S/)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.pagoACuenta ?? 0}
                  onChange={(e) =>
                    setForm({ ...form, pagoACuenta: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* ── Técnico asignado ── */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Técnico asignado</label>
              <Select
                value={form.usuarioTecnicoId || '__none__'}
                onValueChange={(v) =>
                  setForm({ ...form, usuarioTecnicoId: v === '__none__' ? null : v })
                }
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
    </div>
  );
}
