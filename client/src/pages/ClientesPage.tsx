import { useState, useEffect, useCallback } from 'react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  User,
  Phone,
  CreditCard,
  Laptop,
  Eye,
  EyeOff,
} from 'lucide-react';
import { clienteService } from '@/services/cliente.service';
import { equipoClienteService } from '@/services/equipo-cliente.service';
import { TipoEquipoCombobox } from '@/components/forms/TipoEquipoCombobox';
import { MarcaCombobox } from '@/components/forms/MarcaCombobox';
import { useTiposEquipo } from '@/hooks/useTiposEquipo';
import { useMarcas } from '@/hooks/useMarcas';
import type { Cliente, EquipoCliente, CrearClienteDto, CrearEquipoDto } from '@/types';

// ─── Formulario vacío de cliente ────────────────────────────────────────────
const clienteVacio: CrearClienteDto = {
  nombre: '',
  dniRuc: '',
  telefono: '',
  direccion: '',
};

const equipoVacio: CrearEquipoDto = {
  tipoEquipoId: '',
  tipoEquipo: '',
  marcaId: '',
  marca: '',
  modelo: '',
  numeroSerie: '',
  contrasenaPatron: '',
};

export function ClientesPage() {
  const { tiposEquipo, refetch: refetchTiposEquipo } = useTiposEquipo();
  const { marcas, refetch: refetchMarcas } = useMarcas();

  // ── Estado principal ───────────────────────────────────────────────────────
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [total, setTotal] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── Sheet crear/editar cliente ─────────────────────────────────────────────
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [formCliente, setFormCliente] = useState<CrearClienteDto>(clienteVacio);
  const [formErrors, setFormErrors] = useState<{ nombre?: string; telefono?: string }>({});

  // ── Dialog equipos ─────────────────────────────────────────────────────────
  const [equiposDialogOpen, setEquiposDialogOpen] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [equipos, setEquipos] = useState<EquipoCliente[]>([]);
  const [loadingEquipos, setLoadingEquipos] = useState(false);
  const [formEquipo, setFormEquipo] = useState<CrearEquipoDto>(equipoVacio);
  const [tipoRequiereClave, setTipoRequiereClave] = useState(false);
  const [editingEquipo, setEditingEquipo] = useState<EquipoCliente | null>(null);
  const [deleteEquipoId, setDeleteEquipoId] = useState<string | null>(null);
  const [mostrarContrasena, setMostrarContrasena] = useState<Record<string, string | null>>({});
  const [loadingContrasena, setLoadingContrasena] = useState<string | null>(null);
  const [errorEquipos, setErrorEquipos] = useState<string | null>(null);

  // ── Carga de clientes ──────────────────────────────────────────────────────
  const cargarClientes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { clientes: data, total: t } = await clienteService.getAll({
        busqueda: busqueda || undefined,
        limit: 100,
      });
      setClientes(data);
      setTotal(t);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, [busqueda]);

  useEffect(() => {
    cargarClientes();
  }, [cargarClientes]);

  // ── CRUD clientes ──────────────────────────────────────────────────────────
  const handleNuevo = () => {
    setEditingCliente(null);
    setFormCliente(clienteVacio);
    setError(null);
    setFormErrors({});
    setSheetOpen(true);
  };

  const handleEditar = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormCliente({
      nombre: cliente.nombre,
      dniRuc: cliente.dniRuc || '',
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
    });
    setError(null);
    setFormErrors({});
    setSheetOpen(true);
  };

  const handleSubmitCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { nombre?: string; telefono?: string } = {};
    if (!formCliente.nombre.trim()) errors.nombre = 'El nombre es requerido';
    if (!formCliente.telefono?.trim()) errors.telefono = 'El teléfono es requerido';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setSubmitting(true);
    setError(null);
    try {
      const payload: CrearClienteDto = {
        nombre: formCliente.nombre.trim(),
        dniRuc: formCliente.dniRuc?.trim() || null,
        telefono: formCliente.telefono?.trim() || null,
        direccion: formCliente.direccion?.trim() || null,
      };
      if (editingCliente) {
        await clienteService.update(editingCliente.id, payload);
      } else {
        await clienteService.create(payload);
      }
      setSheetOpen(false);
      cargarClientes();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar el cliente');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminar = async (id: string) => {
    const cliente = clientes.find((c) => c.id === id);
    if (cliente && (cliente._count?.ordenes ?? 0) > 0) {
      setError('No se puede eliminar un cliente con órdenes registradas.');
      setDeleteConfirmId(null);
      return;
    }
    setSubmitting(true);
    try {
      await clienteService.delete(id);
      setDeleteConfirmId(null);
      cargarClientes();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al eliminar cliente');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Gestión de equipos ─────────────────────────────────────────────────────
  const abrirEquipos = async (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setEquiposDialogOpen(true);
    setFormEquipo(equipoVacio);
    setTipoRequiereClave(false);
    setEditingEquipo(null);
    setErrorEquipos(null);
    setMostrarContrasena({});
    await cargarEquipos(cliente.id);
  };

  const cargarEquipos = async (clienteId: string) => {
    setLoadingEquipos(true);
    setErrorEquipos(null);
    try {
      const data = await equipoClienteService.getByCliente(clienteId);
      setEquipos(data);
    } catch (err: any) {
      setErrorEquipos(err.response?.data?.error || 'Error al cargar equipos');
    } finally {
      setLoadingEquipos(false);
    }
  };

  const handleSubmitEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteSeleccionado) return;
    if (!formEquipo.tipoEquipo.trim() && !formEquipo.tipoEquipoId) {
      setErrorEquipos('El tipo de equipo es obligatorio.');
      return;
    }
    if (!formEquipo.marca?.trim() && !formEquipo.marcaId) {
      setErrorEquipos('La marca es obligatoria.');
      return;
    }
    setSubmitting(true);
    setErrorEquipos(null);
    try {
      const payload: CrearEquipoDto = {
        tipoEquipoId: formEquipo.tipoEquipoId || null,
        tipoEquipo: formEquipo.tipoEquipo.trim(),
        marcaId: formEquipo.marcaId || null,
        marca: formEquipo.marca?.trim() || null,
        modelo: formEquipo.modelo?.trim() || null,
        numeroSerie: formEquipo.numeroSerie?.trim() || null,
        contrasenaPatron: tipoRequiereClave ? (formEquipo.contrasenaPatron?.trim() || null) : null,
      };
      if (editingEquipo) {
        await equipoClienteService.update(editingEquipo.id, payload);
      } else {
        await equipoClienteService.create(clienteSeleccionado.id, payload);
      }
      setFormEquipo(equipoVacio);
      setTipoRequiereClave(false);
      setEditingEquipo(null);
      await cargarEquipos(clienteSeleccionado.id);
      cargarClientes();
    } catch (err: any) {
      setErrorEquipos(err.response?.data?.error || 'Error al guardar el equipo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditarEquipo = (equipo: EquipoCliente) => {
    setEditingEquipo(equipo);
    const tipoEncontrado = tiposEquipo.find(
      (t) => t.id === equipo.tipoEquipoId || t.nombre.toLowerCase() === equipo.tipoEquipo.toLowerCase()
    );
    setTipoRequiereClave(tipoEncontrado ? tipoEncontrado.requiereClave : false);
    setFormEquipo({
      tipoEquipoId: equipo.tipoEquipoId || (tipoEncontrado ? tipoEncontrado.id : ''),
      tipoEquipo: equipo.tipoEquipo,
      marcaId: equipo.marcaId || '',
      marca: equipo.marca || '',
      modelo: equipo.modelo || '',
      numeroSerie: equipo.numeroSerie || '',
      contrasenaPatron: '',
    });
  };

  const handleEliminarEquipo = async (id: string) => {
    if (!clienteSeleccionado) return;
    setSubmitting(true);
    setErrorEquipos(null);
    try {
      await equipoClienteService.delete(id);
      setDeleteEquipoId(null);
      await cargarEquipos(clienteSeleccionado.id);
      cargarClientes();
    } catch (err: any) {
      setErrorEquipos(err.response?.data?.error || 'Error al eliminar equipo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevelarContrasena = async (equipoId: string) => {
    if (mostrarContrasena[equipoId] !== undefined) {
      setMostrarContrasena((prev) => {
        const next = { ...prev };
        delete next[equipoId];
        return next;
      });
      return;
    }
    setLoadingContrasena(equipoId);
    try {
      const { contrasenaPatron } = await equipoClienteService.revelarContrasena(equipoId);
      setMostrarContrasena((prev) => ({ ...prev, [equipoId]: contrasenaPatron }));
    } catch { /* silencioso */ }
    finally { setLoadingContrasena(null); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Clientes</h2>
          <p className="text-muted-foreground text-sm mt-1">Gestione sus clientes y sus equipos registrados.</p>
        </div>
        <Button onClick={handleNuevo} className="font-bold shadow-sm">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Búsqueda */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, DNI/RUC o teléfono..."
            className="pl-9"
          />
        </div>
        <Badge variant="outline" className="h-10 px-4 flex items-center">
          Total: {total}
        </Badge>
      </div>

      {error && !sheetOpen && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabla */}
      <div className="flex-1 border rounded-lg bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-60">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
            <User className="h-12 w-12 mb-3 opacity-20" />
            <p className="font-medium">No hay clientes registrados</p>
            <p className="text-sm">Crea tu primer cliente para comenzar</p>
          </div>
        ) : (
          <div className="overflow-auto h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>DNI / RUC</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead className="text-center">Equipos</TableHead>
                  <TableHead className="text-center">Órdenes</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        {cliente.nombre}
                      </div>
                    </TableCell>
                    <TableCell>
                      {cliente.dniRuc ? (
                        <Badge variant="outline" className="font-mono text-xs">
                          <CreditCard className="h-3 w-3 mr-1" />
                          {cliente.dniRuc}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {cliente.telefono ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {cliente.telefono}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm">
                      {cliente.direccion || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => abrirEquipos(cliente)}
                        className="h-7 gap-1 text-xs"
                      >
                        <Laptop className="h-3.5 w-3.5" />
                        <span>{cliente._count?.equipos ?? 0}</span>
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-xs">
                        {cliente._count?.ordenes ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {deleteConfirmId === cliente.id ? (
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleEliminar(cliente.id)}
                            disabled={submitting}
                          >
                            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirmar'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteConfirmId(null)}
                            disabled={submitting}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => handleEditar(cliente)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteConfirmId(cliente.id)}
                            disabled={(cliente._count?.ordenes ?? 0) > 0}
                            title={(cliente._count?.ordenes ?? 0) > 0 ? 'No se puede eliminar: tiene órdenes registradas' : 'Eliminar cliente'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ── Sheet: Crear / Editar Cliente ─────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="border-b pb-4">
            <SheetTitle className="text-xl font-bold">
              {editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
            </SheetTitle>
            <SheetDescription>
              Los campos con <span className="text-destructive">*</span> son obligatorios.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmitCliente} className="space-y-5 mt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nombre completo <span className="text-destructive">*</span>
              </label>
              <Input
                value={formCliente.nombre}
                onChange={(e) => {
                  setFormCliente({ ...formCliente, nombre: e.target.value });
                  if (e.target.value.trim()) setFormErrors((prev) => ({ ...prev, nombre: undefined }));
                }}
                placeholder="Ej: Juan Pérez García"
                className={formErrors.nombre ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {formErrors.nombre
                ? <p className="text-xs text-destructive">{formErrors.nombre}</p>
                : <p className="text-xs text-muted-foreground">Nombre completo del cliente. Obligatorio.</p>
              }
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">DNI / RUC</label>
              <Input
                value={formCliente.dniRuc || ''}
                onChange={(e) => setFormCliente({ ...formCliente, dniRuc: e.target.value })}
                placeholder="12345678 o 20123456789"
                maxLength={11}
              />
              <p className="text-xs text-muted-foreground">8 dígitos (DNI) o 11 dígitos (RUC). Opcional.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Teléfono <span className="text-destructive">*</span>
              </label>
              <Input
                type="tel"
                value={formCliente.telefono || ''}
                onChange={(e) => {
                  setFormCliente({ ...formCliente, telefono: e.target.value });
                  if (e.target.value.trim()) setFormErrors((prev) => ({ ...prev, telefono: undefined }));
                }}
                placeholder="999 888 777"
                maxLength={20}
                className={formErrors.telefono ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {formErrors.telefono
                ? <p className="text-xs text-destructive">{formErrors.telefono}</p>
                : <p className="text-xs text-muted-foreground">Número de contacto principal. Obligatorio.</p>
              }
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Dirección</label>
              <Input
                value={formCliente.direccion || ''}
                onChange={(e) => setFormCliente({ ...formCliente, direccion: e.target.value })}
                placeholder="Av. Principal 123, Lima"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
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
                {editingCliente ? 'Actualizar' : 'Crear Cliente'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* ── Dialog: Equipos del cliente ───────────────────────────────────── */}
      <Dialog open={equiposDialogOpen} onOpenChange={setEquiposDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Laptop className="h-5 w-5" />
              Equipos de {clienteSeleccionado?.nombre}
            </DialogTitle>
            <DialogDescription>
              Gestione los dispositivos asociados a este cliente.
            </DialogDescription>
          </DialogHeader>

          {/* Lista de equipos */}
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {loadingEquipos ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : equipos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Este cliente no tiene equipos registrados.
              </p>
            ) : (
              equipos.map((equipo) => (
                <div
                  key={equipo.id}
                  className="flex items-start justify-between gap-3 border rounded-lg px-3 py-2.5 bg-muted/30"
                >
                  <div className="space-y-0.5 flex-1">
                    <p className="text-sm font-semibold">
                      {equipo.tipoEquipo}
                      {equipo.marca && <span className="text-muted-foreground font-normal"> · {equipo.marca}</span>}
                      {equipo.modelo && <span className="text-muted-foreground font-normal"> {equipo.modelo}</span>}
                    </p>
                    {equipo.numeroSerie && (
                      <p className="text-xs text-muted-foreground font-mono">S/N: {equipo.numeroSerie}</p>
                    )}
                    {/* Contraseña/Patrón */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs text-muted-foreground">Contraseña/Patrón:</span>
                      {mostrarContrasena[equipo.id] !== undefined ? (
                        <span className="text-xs font-mono bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-1.5 py-0.5 rounded">
                          {mostrarContrasena[equipo.id] || '(sin contraseña)'}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">••••••</span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => handleRevelarContrasena(equipo.id)}
                        disabled={loadingContrasena === equipo.id}
                        title={mostrarContrasena[equipo.id] !== undefined ? 'Ocultar' : 'Revelar'}
                      >
                        {loadingContrasena === equipo.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : mostrarContrasena[equipo.id] !== undefined ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {deleteEquipoId === equipo.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs"
                          onClick={() => handleEliminarEquipo(equipo.id)}
                          disabled={submitting}
                        >
                          {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirmar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setDeleteEquipoId(null)}
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditarEquipo(equipo)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 hover:text-destructive"
                          onClick={() => setDeleteEquipoId(equipo.id)}
                          disabled={(equipo._count?.equiposOrdenes ?? 0) > 0}
                          title={(equipo._count?.equiposOrdenes ?? 0) > 0 ? 'Tiene órdenes asociadas' : 'Eliminar equipo'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Formulario agregar/editar equipo */}
          <div className="border-t pt-4 mt-2">
            <h4 className="text-sm font-semibold mb-3">
              {editingEquipo ? 'Editar equipo' : 'Agregar nuevo equipo'}
            </h4>
            <form onSubmit={handleSubmitEquipo} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">
                    Tipo de equipo <span className="text-destructive">*</span>
                  </label>
                  <TipoEquipoCombobox
                    value={formEquipo.tipoEquipoId || ''}
                    onChange={(id, nombre, requiereClave) => {
                      setFormEquipo((p) => ({
                        ...p,
                        tipoEquipoId: id,
                        tipoEquipo: nombre || '',
                        ...(requiereClave ? {} : { contrasenaPatron: '' }),
                      }));
                      setTipoRequiereClave(!!requiereClave);
                    }}
                    tiposEquipo={tiposEquipo}
                    onTipoEquipoCreado={refetchTiposEquipo}
                    onRefresh={refetchTiposEquipo}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">
                    Marca <span className="text-destructive">*</span>
                  </label>
                  <MarcaCombobox
                    value={formEquipo.marcaId || ''}
                    onChange={(id, nombre) => {
                      setFormEquipo((p) => ({
                        ...p,
                        marcaId: id,
                        marca: nombre || '',
                      }));
                    }}
                    marcas={marcas}
                    onMarcaCreada={refetchMarcas}
                    onRefresh={refetchMarcas}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Modelo</label>
                  <Input
                    value={formEquipo.modelo || ''}
                    onChange={(e) => setFormEquipo({ ...formEquipo, modelo: e.target.value })}
                    placeholder="Ej: Pavilion 15"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Número de serie</label>
                  <Input
                    value={formEquipo.numeroSerie || ''}
                    onChange={(e) => setFormEquipo({ ...formEquipo, numeroSerie: e.target.value })}
                    placeholder="S/N del equipo"
                    className="h-8 text-sm"
                  />
                </div>
                {tipoRequiereClave && (
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-medium">
                      Contraseña / Patrón de desbloqueo
                    </label>
                    <Input
                      value={formEquipo.contrasenaPatron || ''}
                      onChange={(e) => setFormEquipo({ ...formEquipo, contrasenaPatron: e.target.value })}
                      placeholder="Contraseña o patrón (se almacena cifrado)"
                      className="h-8 text-sm"
                      type="password"
                      autoComplete="new-password"
                    />
                    <p className="text-xs text-muted-foreground">
                      Solo visible para el técnico al revelar. Deja en blanco para no modificar.
                    </p>
                  </div>
                )}
              </div>

              {errorEquipos && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="text-xs">{errorEquipos}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-1">
                {editingEquipo && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditingEquipo(null); setFormEquipo(equipoVacio); setTipoRequiereClave(false); }}
                    disabled={submitting}
                  >
                    Cancelar edición
                  </Button>
                )}
                <Button type="submit" size="sm" disabled={submitting} className="ml-auto">
                  {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  {editingEquipo ? 'Guardar cambios' : 'Agregar equipo'}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
