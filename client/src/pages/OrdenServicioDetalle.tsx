import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { pdf } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EstadoBadge } from '@/components/EstadoBadge';
import { OrdenServicioPDF } from '@/components/OrdenServicioPDF';
import {
  ArrowLeft,
  FileDown,
  Loader2,
  Plus,
  Trash2,
  MessageSquare,
  Send,
  Pencil,
  Save,
  X,
  Package,
  User,
  Laptop,
  Wrench,
  ChevronRight,
} from 'lucide-react';
import { ordenServicioService } from '@/services/orden-servicio.service';
import { productoService } from '@/services/producto.service';
import { usuarioService } from '@/services/usuario.service';
import type { OrdenServicio, EstadoOrden, Usuario, AgregarItemOrdenDto, ActualizarOrdenDto } from '@/types';

// Transiciones válidas
const TRANSICIONES: Record<EstadoOrden, { estado: EstadoOrden; label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary'; requiereSaldoCero?: boolean }[]> = {
  RECIBIDA: [
    { estado: 'EN_REPARACION', label: 'Iniciar Reparación', variant: 'default' },
    { estado: 'CANCELADA', label: 'Cancelar', variant: 'destructive' },
  ],
  EN_REPARACION: [
    { estado: 'LISTA', label: 'Marcar como Lista', variant: 'default' },
    { estado: 'CANCELADA', label: 'Cancelar OS', variant: 'destructive' },
  ],
  LISTA: [
    { estado: 'ENTREGADA', label: 'Registrar Entrega', variant: 'default', requiereSaldoCero: true },
    { estado: 'EN_REPARACION', label: 'Volver a Reparación', variant: 'outline' },
    { estado: 'CANCELADA', label: 'Cancelar', variant: 'destructive' },
  ],
  ENTREGADA: [],
  CANCELADA: [],
};

const fmt = (val: string | null | undefined) =>
  val ? `S/ ${parseFloat(val).toFixed(2)}` : 'S/ 0.00';

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

const fmtFechaHora = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

// Componente
export function OrdenServicioDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [orden, setOrden] = useState<OrdenServicio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar orden
  const cargarOrden = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await ordenServicioService.getById(id);
      setOrden(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Orden no encontrada');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { cargarOrden(); }, [cargarOrden]);

  // Cambio de estado
  const [cambiandoEstado, setCambiandoEstado] = useState<EstadoOrden | null>(null);
  const [confirmEstado, setConfirmEstado] = useState<{ estado: EstadoOrden; label: string } | null>(null);

  const handleCambiarEstado = async (nuevoEstado: EstadoOrden) => {
    if (!id) return;
    setCambiandoEstado(nuevoEstado);
    try {
      await ordenServicioService.cambiarEstado(id, nuevoEstado);
      setConfirmEstado(null);
      await cargarOrden();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cambiar estado');
    } finally {
      setCambiandoEstado(null);
    }
  };

  // Edición de orden 
  const [editando, setEditando] = useState(false);
  const [formEdit, setFormEdit] = useState<ActualizarOrdenDto>({});
  const [guardando, setGuardando] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [pagoACuentaError, setPagoACuentaError] = useState<string | null>(null);

  const handleAbrirEdicion = async () => {
    if (!orden) return;
    setFormEdit({
      problemaReportado: orden.problemaReportado,
      diagnosticoInicial: orden.diagnosticoInicial || '',
      costoEstimado: orden.costoEstimado ? parseFloat(orden.costoEstimado) : null,
      pagoACuenta: parseFloat(orden.pagoACuenta),
      usuarioTecnicoId: orden.usuarioTecnicoId || null,
    });
    setPagoACuentaError(null);
    if (usuarios.length === 0) {
      const us = await usuarioService.getAll();
      setUsuarios(us);
    }
    setEditando(true);
  };

  const handleGuardarEdicion = async () => {
    if (!id) return;
    setGuardando(true);
    try {
      await ordenServicioService.update(id, {
        ...formEdit,
        diagnosticoInicial: formEdit.diagnosticoInicial || null,
        usuarioTecnicoId: formEdit.usuarioTecnicoId || null,
      });
      setEditando(false);
      await cargarOrden();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar cambios');
    } finally {
      setGuardando(false);
    }
  };

  // Agregar ítem
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [busquedaProd, setBusquedaProd] = useState('');
  const [resultadosProd, setResultadosProd] = useState<{ id: string; nombre: string; marca: string | null; modelo: string | null; stockActual: number; esServicio: boolean; precioVenta: number | string }[]>([]);
  const [buscandoProd, setBuscandoProd] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState<{ id: string; nombre: string; stockActual: number; esServicio: boolean; precioVenta: number | string } | null>(null);
  const [itemCantidad, setItemCantidad] = useState(1);
  const [itemPrecio, setItemPrecio] = useState<number>(0);
  const [agregandoItem, setAgregandoItem] = useState(false);
  const [removeItemId, setRemoveItemId] = useState<string | null>(null);
  const [removingItem, setRemovingItem] = useState<string | null>(null);
  const busquedaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buscarProductos = (q: string) => {
    setBusquedaProd(q);
    if (busquedaTimer.current) clearTimeout(busquedaTimer.current);
    if (!q.trim()) { setResultadosProd([]); return; }
    busquedaTimer.current = setTimeout(async () => {
      setBuscandoProd(true);
      try {
        const data = await productoService.buscarParaCombobox(q, undefined, true);
        setResultadosProd(data);
      } catch { /* silencioso */ }
      finally { setBuscandoProd(false); }
    }, 300);
  };

  const handleAgregarItem = async () => {
    if (!id || !itemSeleccionado) return;
    setAgregandoItem(true);
    try {
      const payload: AgregarItemOrdenDto = {
        productoId: itemSeleccionado.id,
        cantidad: itemCantidad,
        precioUnitario: itemPrecio,
      };
      await ordenServicioService.agregarItem(id, payload);
      setAddItemOpen(false);
      setBusquedaProd('');
      setResultadosProd([]);
      setItemSeleccionado(null);
      setItemCantidad(1);
      setItemPrecio(0);
      await cargarOrden();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al agregar ítem');
    } finally {
      setAgregandoItem(false);
    }
  };

  const handleQuitarItem = async (itemId: string) => {
    if (!id) return;
    setRemovingItem(itemId);
    try {
      await ordenServicioService.quitarItem(id, itemId);
      setRemoveItemId(null);
      await cargarOrden();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al quitar ítem');
    } finally {
      setRemovingItem(null);
    }
  };

  // Nota técnica
  const [nuevaNota, setNuevaNota] = useState('');
  const [enviandoNota, setEnviandoNota] = useState(false);
  const notasEndRef = useRef<HTMLDivElement>(null);

  const handleEnviarNota = async () => {
    if (!id || !nuevaNota.trim()) return;
    setEnviandoNota(true);
    try {
      await ordenServicioService.crearNota(id, nuevaNota.trim());
      setNuevaNota('');
      await cargarOrden();
      setTimeout(() => notasEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al enviar nota');
    } finally {
      setEnviandoNota(false);
    }
  };

  // Descargar PDF
  const [generandoPDF, setGenerandoPDF] = useState(false);

  const handleDescargarPDF = async () => {
    if (!orden) return;
    setGenerandoPDF(true);
    try {
      const blob = await pdf(<OrdenServicioPDF orden={orden} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${orden.codigoFormateado}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generando PDF', err);
    } finally {
      setGenerandoPDF(false);
    }
  };

  // Saldo pendiente
  const saldo = orden
    ? parseFloat(orden.total) - parseFloat(orden.pagoACuenta)
    : 0;

  // Si la orden es editable
  const esEditable = orden
    ? orden.estado !== 'ENTREGADA' && orden.estado !== 'CANCELADA'
    : false;

  // Render
  if (loading) {
    return (
      <div className="flex items-center justify-center h-60">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !orden) {
    return (
      <div className="flex flex-col items-center justify-center h-60 gap-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => navigate('/ordenes-servicio')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Órdenes
        </Button>
      </div>
    );
  }

  if (!orden) return null;

  const transicionesPosibles = TRANSICIONES[orden.estado] || [];

  return (
    <div className="flex flex-col gap-5">
      {/* Breadcrumb + Header */}
      <div className="flex flex-col gap-2">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-muted-foreground gap-1.5">
          <Link to="/ordenes-servicio" className="hover:text-foreground transition-colors">
            Órdenes de Servicio
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">{orden.codigoFormateado}</span>
        </nav>

        {/* Header principal */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate('/ordenes-servicio')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold font-mono text-foreground">
                  {orden.codigoFormateado}
                </h2>
                <EstadoBadge estado={orden.estado} />
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Emitida el {fmtFecha(orden.fechaEmision)} · Registrada por{' '}
                {orden.usuarioRegistro?.nombreCompleto}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDescargarPDF}
              disabled={generandoPDF}
            >
              {generandoPDF ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              Descargar PDF
            </Button>
          </div>
        </div>

        {/* Botones de transición */}
        {transicionesPosibles.length > 0 && (
          <div className="flex flex-col gap-2 p-3 bg-muted/40 rounded-lg border">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground mr-1">Cambiar estado:</span>
              {transicionesPosibles.map((t) => {
                const bloqueadoPorSaldo = t.requiereSaldoCero && saldo > 0;
                return (
                  <Button
                    key={t.estado}
                    variant={t.variant}
                    size="sm"
                    onClick={() => setConfirmEstado({ estado: t.estado, label: t.label })}
                    disabled={cambiandoEstado !== null || bloqueadoPorSaldo}
                    title={bloqueadoPorSaldo ? `Saldo pendiente: ${fmt(String(saldo))}` : undefined}
                  >
                    {cambiandoEstado === t.estado && (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    )}
                    {t.label}
                  </Button>
                );
              })}
            </div>
            {transicionesPosibles.some((t) => t.requiereSaldoCero && saldo > 0) && (
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                Para registrar la entrega primero debe registrarse el pago del saldo pendiente de{' '}
                <span className="font-semibold">{fmt(String(saldo))}</span>
              </p>
            )}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Layout principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Columna izquierda (7/12) */}
        <div className="lg:col-span-7 flex flex-col gap-5">

          {/* Problema + diagnóstico */}
          <div className="border rounded-lg bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                Detalle del Servicio
              </h3>
              {esEditable && !editando && (
                <Button variant="ghost" size="sm" onClick={handleAbrirEdicion}>
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Editar
                </Button>
              )}
            </div>

            {editando ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Problema reportado</label>
                  <Textarea
                    value={formEdit.problemaReportado || ''}
                    onChange={(e) => setFormEdit({ ...formEdit, problemaReportado: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Diagnóstico</label>
                  <Textarea
                    value={formEdit.diagnosticoInicial || ''}
                    onChange={(e) => setFormEdit({ ...formEdit, diagnosticoInicial: e.target.value })}
                    rows={2}
                    placeholder="Diagnóstico técnico..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Costo est. (S/)</label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={formEdit.costoEstimado ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) {
                          setFormEdit((prev) => ({ ...prev, costoEstimado: v as any }));
                        }
                      }}
                      onBlur={(e) => {
                        const num = parseFloat(e.target.value);
                        setFormEdit((prev) => ({
                          ...prev,
                          costoEstimado: e.target.value === '' || isNaN(num) || num < 0 ? null : num,
                        }));
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Pago a cuenta (S/)</label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={formEdit.pagoACuenta ?? ''}
                      className={pagoACuentaError ? 'border-destructive focus-visible:ring-destructive' : ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) {
                          setFormEdit((prev) => ({ ...prev, pagoACuenta: v as any }));
                          setPagoACuentaError(null);
                        }
                      }}
                      onBlur={(e) => {
                        const num = parseFloat(e.target.value);
                        const normalizado = isNaN(num) || num < 0 ? 0 : num;
                        const total = orden ? parseFloat(orden.total) : 0;
                        if (normalizado > total) {
                          setPagoACuentaError(`No puede superar el total (${fmt(orden?.total)})`);
                        } else {
                          setPagoACuentaError(null);
                        }
                        setFormEdit((prev) => ({ ...prev, pagoACuenta: normalizado }));
                      }}
                      placeholder="0.00"
                    />
                    {pagoACuentaError && (
                      <p className="text-xs text-destructive">{pagoACuentaError}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Técnico asignado</label>
                  <Select
                    value={formEdit.usuarioTecnicoId || '__none__'}
                    onValueChange={(v) =>
                      setFormEdit({ ...formEdit, usuarioTecnicoId: v === '__none__' ? null : v })
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
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={handleGuardarEdicion} disabled={guardando || !!pagoACuentaError}>
                    {guardando && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                    Guardar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditando(false)} disabled={guardando}>
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Problema reportado</p>
                  <p className="text-sm">{orden.problemaReportado}</p>
                </div>
                {orden.diagnosticoInicial && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Diagnóstico</p>
                    <p className="text-sm">{orden.diagnosticoInicial}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Repuestos / Ítems */}
          <div className="border rounded-lg bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                Repuestos y Servicios
                {orden.items && orden.items.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{orden.items.length}</Badge>
                )}
              </h3>
              {esEditable && (
                <Button variant="outline" size="sm" onClick={() => setAddItemOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Agregar
                </Button>
              )}
            </div>

            {!orden.items || orden.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm gap-2">
                <Package className="h-8 w-8 opacity-20" />
                <p>Sin repuestos ni servicios agregados</p>
                {esEditable && (
                  <Button variant="link" size="sm" onClick={() => setAddItemOpen(true)}>
                    Agregar el primero
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto / Servicio</TableHead>
                    <TableHead className="text-center w-16">Cant.</TableHead>
                    <TableHead className="text-right w-24">P. Unit.</TableHead>
                    <TableHead className="text-right w-28">Subtotal</TableHead>
                    {esEditable && <TableHead className="w-12" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orden.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.producto?.esServicio ? (
                            <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          ) : (
                            <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{item.producto?.nombre || 'Producto'}</p>
                            {item.producto?.sku && (
                              <p className="text-xs text-muted-foreground font-mono">SKU: {item.producto.sku}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{item.cantidad}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(item.precioUnitario)}</TableCell>
                      <TableCell className="text-right font-medium text-sm">{fmt(item.subtotal)}</TableCell>
                      {esEditable && (
                        <TableCell>
                          {removeItemId === item.id ? (
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="destructive"
                                className="h-6 w-6"
                                onClick={() => handleQuitarItem(item.id)}
                                disabled={removingItem === item.id}
                              >
                                {removingItem === item.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => setRemoveItemId(null)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:text-destructive"
                              onClick={() => setRemoveItemId(item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Notas técnicas */}
          <div className="border rounded-lg bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Notas Técnicas
                {orden.notas && orden.notas.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{orden.notas.length}</Badge>
                )}
              </h3>
            </div>

            {/* Timeline */}
            <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
              {!orden.notas || orden.notas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin notas aún.</p>
              ) : (
                orden.notas.map((nota) => (
                  <div key={nota.id} className="flex gap-3">
                    <div className="mt-1 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 bg-muted/40 rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold">{nota.usuario?.nombreCompleto || 'Técnico'}</span>
                        <span className="text-xs text-muted-foreground">{fmtFechaHora(nota.createdAt)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{nota.contenido}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={notasEndRef} />
            </div>

            {/* Agregar nota */}
            {esEditable && (
              <div className="px-4 pb-4 pt-2 border-t flex gap-2">
                <Textarea
                  value={nuevaNota}
                  onChange={(e) => setNuevaNota(e.target.value)}
                  placeholder="Agregar nota técnica..."
                  rows={2}
                  className="flex-1 resize-none text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) handleEnviarNota();
                  }}
                />
                <Button
                  size="icon"
                  onClick={handleEnviarNota}
                  disabled={enviandoNota || !nuevaNota.trim()}
                  className="self-end h-9 w-9"
                  title="Enviar (Ctrl+Enter)"
                >
                  {enviandoNota ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── Columna derecha (5/12) ───────────────────────────────── */}
        <div className="lg:col-span-5 flex flex-col gap-5">

          {/* Cliente */}
          <div className="border rounded-lg bg-card p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              Cliente
            </h3>
            <div className="space-y-1.5">
              <p className="font-semibold">{orden.cliente?.nombre}</p>
              {orden.cliente?.dniRuc && (
                <p className="text-sm text-muted-foreground font-mono">DNI/RUC: {orden.cliente.dniRuc}</p>
              )}
              {orden.cliente?.telefono && (
                <p className="text-sm text-muted-foreground">Tel: {orden.cliente.telefono}</p>
              )}
            </div>
            <Link
              to={`/clientes`}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Ver todos los clientes <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Equipo */}
          <div className="border rounded-lg bg-card p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <Laptop className="h-4 w-4 text-muted-foreground" />
              Equipo
            </h3>
            <div className="space-y-1.5">
              <p className="font-semibold">{orden.equipo?.tipoEquipo}</p>
              {(orden.equipo?.marca || orden.equipo?.modelo) && (
                <p className="text-sm text-muted-foreground">
                  {[orden.equipo.marca, orden.equipo.modelo].filter(Boolean).join(' ')}
                </p>
              )}
              {orden.equipo?.numeroSerie && (
                <p className="text-xs text-muted-foreground font-mono">S/N: {orden.equipo.numeroSerie}</p>
              )}
            </div>
          </div>

          {/* Técnico */}
          <div className="border rounded-lg bg-card p-4 space-y-2">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              Técnico asignado
            </h3>
            {orden.usuarioTecnico ? (
              <p className="text-sm font-medium">{orden.usuarioTecnico.nombreCompleto}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sin asignar</p>
            )}
          </div>

          {/* Resumen económico */}
          <div className="border rounded-lg bg-card p-4 space-y-3">
            <h3 className="font-semibold text-sm">Resumen Económico</h3>
            <div className="space-y-2 text-sm">
              {orden.costoEstimado && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Costo estimado</span>
                  <span>{fmt(orden.costoEstimado)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Total a pagar</span>
                <span className="font-medium text-foreground">{fmt(orden.total)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Pago a cuenta</span>
                <span>- {fmt(orden.pagoACuenta)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
                <span>Saldo pendiente</span>
                <span className={saldo > 0 ? 'text-destructive' : 'text-green-600'}>
                  {fmt(String(saldo))}
                </span>
              </div>
              {orden.gananciaTotal && parseFloat(orden.gananciaTotal) !== 0 && (
                <div className="flex justify-between text-xs text-muted-foreground border-t pt-2">
                  <span>Ganancia neta</span>
                  <span className="text-green-600">{fmt(orden.gananciaTotal)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Dialog confirmar cambio de estado ──────────────────────── */}
      <Dialog open={!!confirmEstado} onOpenChange={() => setConfirmEstado(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar cambio de estado</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Confirmas cambiar el estado de{' '}
            <span className="font-medium text-foreground">{orden.codigoFormateado}</span> a{' '}
            <span className="font-semibold text-foreground">"{confirmEstado?.label}"</span>?
          </p>
          {confirmEstado?.estado === 'CANCELADA' && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">
                Al cancelar, todos los repuestos físicos se devolverán al stock automáticamente.
              </AlertDescription>
            </Alert>
          )}
          <div className="flex gap-3 mt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmEstado(null)}
              disabled={cambiandoEstado !== null}
            >
              Cancelar
            </Button>
            <Button
              variant={confirmEstado?.estado === 'CANCELADA' ? 'destructive' : 'default'}
              className="flex-1"
              onClick={() => confirmEstado && handleCambiarEstado(confirmEstado.estado)}
              disabled={cambiandoEstado !== null}
            >
              {cambiandoEstado !== null && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog agregar ítem ─────────────────────────────────────── */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Repuesto / Servicio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Búsqueda de producto */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar producto</label>
              <div className="relative">
                <Input
                  value={busquedaProd}
                  onChange={(e) => buscarProductos(e.target.value)}
                  placeholder="Nombre, modelo, marca..."
                  autoFocus
                />
                {buscandoProd && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {resultadosProd.length > 0 && !itemSeleccionado && (
                <div className="border rounded-md overflow-hidden max-h-44 overflow-y-auto">
                  {resultadosProd.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => {
                        setItemSeleccionado(p);
                        setItemCantidad(1);
                        setItemPrecio(parseFloat(String(p.precioVenta)) || 0);
                        setResultadosProd([]);
                        setBusquedaProd(p.nombre);
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-muted/60 text-sm border-b last:border-b-0 flex justify-between"
                    >
                      <span>
                        {p.nombre}
                        {p.marca ? ` — ${p.marca}` : ''}
                        {p.modelo ? ` ${p.modelo}` : ''}
                      </span>
                      {p.esServicio
                        ? <span className="text-xs text-muted-foreground">Servicio</span>
                        : <span className="text-xs text-muted-foreground">Stock: {p.stockActual}</span>}
                    </button>
                  ))}
                </div>
              )}
              {itemSeleccionado && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {itemSeleccionado.nombre}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => {
                      setItemSeleccionado(null);
                      setBusquedaProd('');
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  {itemSeleccionado.esServicio
                    ? <span className="text-xs text-muted-foreground">Servicio</span>
                    : <span className="text-xs text-muted-foreground">Stock disponible: {itemSeleccionado.stockActual}</span>}
                </div>
              )}
            </div>

            {/* Cantidad y precio */}
            {itemSeleccionado && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Cantidad</label>
                  <Input
                    type="number"
                    min="1"
                    value={itemCantidad}
                    onChange={(e) => setItemCantidad(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Precio unit. (S/)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemPrecio}
                    disabled
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setAddItemOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleAgregarItem}
                disabled={!itemSeleccionado || itemPrecio <= 0 || agregandoItem}
              >
                {agregandoItem && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Agregar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
