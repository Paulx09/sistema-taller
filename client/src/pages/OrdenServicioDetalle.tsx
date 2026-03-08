import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight,
  Laptop,
  Minus,
  Plus,
  Trash2,
  Save,
  Pencil,
  X,
  Loader2,
  MessageCircle,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  WrenchIcon,
  PackageCheck,
  User,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
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
import { EstadoBadge } from '@/components/EstadoBadge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { pdf } from '@react-pdf/renderer';
import { GlobalPDFDoc, EquipoPDFDoc } from '@/pages/OrdenServicioPDF';
import { ordenServicioService } from '@/services/orden-servicio.service';
import { usuarioService } from '@/services/usuario.service';
import { clienteService } from '@/services/cliente.service';
import { productoService } from '@/services/producto.service';
import type {
  OrdenServicio,
  EquipoOrden,
  NotaTecnica,
  EstadoEquipoOrden,
  AgregarItemOrdenDto,
  ActualizarEquipoOrdenDto,
  Usuario,
  Producto,
  EquipoOrdenInputDto,
  EquipoCliente,
} from '@/types';
import { cn } from '@/lib/utils';

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(val: string | number | null | undefined): string {
  const n = parseFloat(String(val ?? '0'));
  return isNaN(n) ? '0.00' : n.toFixed(2);
}

const ESTADO_EQUIPO_CONFIG: Record<
  EstadoEquipoOrden,
  { label: string; icon: React.ReactNode; className: string }
> = {
  RECIBIDA: {
    label: 'Recibida',
    icon: <Clock className="h-3.5 w-3.5" />,
    className:
      'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  },
  EN_REPARACION: {
    label: 'En Reparación',
    icon: <WrenchIcon className="h-3.5 w-3.5" />,
    className:
      'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
  },
  LISTA: {
    label: 'Lista',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    className:
      'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
  },
  CANCELADA: {
    label: 'Cancelada',
    icon: <X className="h-3.5 w-3.5" />,
    className:
      'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  },
};

function getTransicionLabel(from: EstadoEquipoOrden, to: EstadoEquipoOrden): string {
  if (to === 'CANCELADA') return 'Cancelar Orden';
  if (from === 'RECIBIDA' && to === 'EN_REPARACION') return 'Iniciar Reparación';
  if (from === 'LISTA' && to === 'EN_REPARACION') return 'Volver a Reparación';
  return ESTADO_EQUIPO_CONFIG[to].label;
}

/** Transiciones válidas desde un estado de equipo */
const TRANSICIONES: Record<EstadoEquipoOrden, EstadoEquipoOrden[]> = {
  RECIBIDA: ['EN_REPARACION', 'CANCELADA'],
  EN_REPARACION: ['LISTA', 'CANCELADA'],
  LISTA: ['EN_REPARACION', 'CANCELADA'],
  CANCELADA: [],
};

function EquipoBadge({ estado }: { estado: EstadoEquipoOrden }) {
  const cfg = ESTADO_EQUIPO_CONFIG[estado];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        cfg.className
      )}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── constantes vacías ─────────────────────────────────────────────────────────

const EQUIPO_NUEVO_VACIO = { tipoEquipo: '', marca: '', modelo: '', numeroSerie: '', contrasenaPatron: '' };

const EQUIPO_ENTRADA_VACIO = {
  equipoId: '',
  problemaReportado: '',
  diagnosticoTecnico: '',
  costoEstimado: '',
};

// ─── componente principal ─────────────────────────────────────────────────────

export function OrdenServicioDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ── datos principales ──────────────────────────────────────────────────────
  const [orden, setOrden] = useState<OrdenServicio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // equipo activo en el sidebar
  const [equipoActivoId, setEquipoActivoId] = useState<string | null>(null);

  // notas del equipo activo
  const [notas, setNotas] = useState<NotaTecnica[]>([]);
  const [notaContenido, setNotaContenido] = useState('');
  const [guardandoNota, setGuardandoNota] = useState(false);

  // edición inline del equipo activo
  const [editandoEquipo, setEditandoEquipo] = useState(false);
  const [formEquipo, setFormEquipo] = useState<ActualizarEquipoOrdenDto>({});
  const [costoEstimadoStr, setCostoEstimadoStr] = useState('');
  const [guardandoEquipo, setGuardandoEquipo] = useState(false);

  // cambio de estado del equipo
  const [cambiandoEstadoEquipo, setCambiandoEstadoEquipo] = useState(false);
  const [confirmEstado, setConfirmEstado] = useState<{
    open: boolean;
    estado: EstadoEquipoOrden | null;
    titulo: string;
    descripcion: string;
  }>({ open: false, estado: null, titulo: '', descripcion: '' });

  // técnico
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [guardandoTecnico, setGuardandoTecnico] = useState(false);

  // pago a cuenta edición inline
  const [editandoPago, setEditandoPago] = useState(false);
  const [pagoInput, setPagoInput] = useState('');
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [pagoError, setPagoError] = useState<string | null>(null);

  // marcar entregada
  const [marcandoEntregada, setMarcandoEntregada] = useState(false);

  // descarga PDF
  const [descargandoPDF, setDescargandoPDF] = useState(false);

  // Dialog: agregar ítem
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [buscandoProductos, setBuscandoProductos] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [itemForm, setItemForm] = useState<{
    productoId: string;
    productoNombre: string;
    cantidad: string;
    precioUnitario: string;
  }>({ productoId: '', productoNombre: '', cantidad: '1', precioUnitario: '' });
  const [guardandoItem, setGuardandoItem] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  // Edición inline de cantidad en la tabla
  const [editandoCantidad, setEditandoCantidad] = useState<{ itemId: string; valor: string } | null>(null);
  const [guardandoCantidad, setGuardandoCantidad] = useState(false);
  const [cantidadError, setCantidadError] = useState<string | null>(null);

  // Dialog: agregar otro equipo
  const [agregarEquipoDialogOpen, setAgregarEquipoDialogOpen] = useState(false);
  const [equiposCliente, setEquiposCliente] = useState<EquipoCliente[]>([]);
  const [equipoEntrada, setEquipoEntrada] = useState({ ...EQUIPO_ENTRADA_VACIO });
  const [mostrarFormEquipoNuevo, setMostrarFormEquipoNuevo] = useState(false);
  const [formNuevoEquipo, setFormNuevoEquipo] = useState({ ...EQUIPO_NUEVO_VACIO });
  const [submittingNuevoEquipo, setSubmittingNuevoEquipo] = useState(false);
  const [errorNuevoEquipo, setErrorNuevoEquipo] = useState<string | null>(null);
  const [verContrasenaEquipo, setVerContrasenaEquipo] = useState(false);
  const [entradaEquipoError, setEntradaEquipoError] = useState<string | null>(null);
  const [agregarEquipoLoading, setAgregarEquipoLoading] = useState(false);

  // ── carga inicial ──────────────────────────────────────────────────────────
  const cargarOrden = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await ordenServicioService.getById(id);
      setOrden(data);
      setEquipoActivoId((prev) => {
        if (prev && data.equipos?.find((e) => e.id === prev)) return prev;
        return data.equipos?.[0]?.id ?? null;
      });
    } catch {
      setError('No se pudo cargar la orden de servicio.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargarOrden();
    usuarioService.getAll().then(setUsuarios).catch(() => {});
  }, [cargarOrden]);

  // ── notas al cambiar equipo activo ─────────────────────────────────────────
  useEffect(() => {
    if (!id || !equipoActivoId) {
      setNotas([]);
      return;
    }
    ordenServicioService
      .getNotas(id, equipoActivoId)
      .then(setNotas)
      .catch(() => setNotas([]));
  }, [id, equipoActivoId]);

  // ── estado derivado ────────────────────────────────────────────────────────
  const equipoActivo: EquipoOrden | null =
    orden?.equipos?.find((e) => e.id === equipoActivoId) ?? null;

  const subtotalOS =
    orden?.equipos?.reduce((acc, eq) => acc + parseFloat(eq.subtotal ?? '0'), 0) ?? 0;

  const pagoACuenta = parseFloat(orden?.pagoACuenta ?? '0');
  const saldoPendiente = Math.max(0, subtotalOS - pagoACuenta);
  const puedeEntregarSe = orden?.estado === 'LISTA' && saldoPendiente === 0;

  // ── sincronizar form al cambiar equipo ─────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (equipoActivo) {
      setFormEquipo({
        problemaReportado: equipoActivo.problemaReportado,
        diagnosticoTecnico: equipoActivo.diagnosticoTecnico ?? '',
        costoEstimado: equipoActivo.costoEstimado
          ? parseFloat(equipoActivo.costoEstimado)
          : null,
      });
      setCostoEstimadoStr(equipoActivo.costoEstimado ? String(Number.parseFloat(equipoActivo.costoEstimado)) : '');
      setEditandoEquipo(false);
    }
  }, [equipoActivo?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── acciones ───────────────────────────────────────────────────────────────
  async function handleGuardarEquipo() {
    if (!id || !equipoActivoId) return;
    setGuardandoEquipo(true);
    try {
      const parsedCosto = costoEstimadoStr === '' ? null : Number.parseFloat(costoEstimadoStr);
      const updated = await ordenServicioService.actualizarEquipo(
        id,
        equipoActivoId,
        { ...formEquipo, costoEstimado: (parsedCosto !== null && !Number.isNaN(parsedCosto)) ? parsedCosto : null }
      );
      setOrden(updated);
      setEditandoEquipo(false);
    } catch {
      //
    } finally {
      setGuardandoEquipo(false);
    }
  }

  function handleSolicitarCambioEstado(sig: EstadoEquipoOrden) {
    const estadoActual = equipoActivo?.estado;
    const necesitaConfirm =
      sig === 'CANCELADA' ||
      (sig === 'EN_REPARACION' && estadoActual === 'RECIBIDA');
    if (necesitaConfirm) {
      const titulo =
        sig === 'CANCELADA' ? '¿Cancelar este equipo?' : '¿Iniciar la reparación?';
      const descripcion =
        sig === 'CANCELADA'
          ? 'Esta acción no se puede deshacer. El equipo quedará cancelado permanentemente.'
          : '¿Estás seguro de que deseas iniciar la reparación de este equipo?';
      setConfirmEstado({ open: true, estado: sig, titulo, descripcion });
    } else {
      handleCambiarEstadoEquipo(sig);
    }
  }

  async function handleCambiarEstadoEquipo(nuevoEstado: EstadoEquipoOrden) {
    if (!id || !equipoActivoId) return;
    setCambiandoEstadoEquipo(true);
    try {
      const updated = await ordenServicioService.cambiarEstadoEquipo(
        id,
        equipoActivoId,
        { estado: nuevoEstado }
      );
      setOrden(updated);
    } catch {
      //
    } finally {
      setCambiandoEstadoEquipo(false);
    }
  }

  async function handleGuardarTecnico(val: string) {
    if (!id) return;
    setGuardandoTecnico(true);
    try {
      const updated = await ordenServicioService.update(id, {
        usuarioTecnicoId: val === 'none' ? null : val,
      });
      setOrden(updated);
    } catch {
      //
    } finally {
      setGuardandoTecnico(false);
    }
  }

  async function handleGuardarPago() {
    if (!id) return;
    const valor = Number.parseFloat(pagoInput) || 0;
    if (valor > subtotalOS) {
      setPagoError(`El pago a cuenta (S/ ${fmt(valor)}) no puede superar el total (S/ ${fmt(subtotalOS)}).`);
      return;
    }
    setPagoError(null);
    setGuardandoPago(true);
    try {
      const updated = await ordenServicioService.update(id, {
        pagoACuenta: valor,
      });
      setOrden(updated);
      setEditandoPago(false);
    } catch {
      //
    } finally {
      setGuardandoPago(false);
    }
  }

  async function handleDownloadPDF(soloEquipo: boolean) {
    if (!orden) return;
    setDescargandoPDF(true);
    try {
      const doc = soloEquipo && equipoActivo
        ? <EquipoPDFDoc orden={orden} equipoOrden={equipoActivo} />
        : <GlobalPDFDoc orden={orden} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${orden.codigoFormateado}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silencioso
    } finally {
      setDescargandoPDF(false);
    }
  }

  async function handleMarcarEntregada() {
    if (!id) return;
    setMarcandoEntregada(true);
    try {
      const updated = await ordenServicioService.cambiarEstado(id, 'ENTREGADA');
      setOrden(updated);
    } catch {
      //
    } finally {
      setMarcandoEntregada(false);
    }
  }

  async function handleAgregarNota() {
    if (!id || !equipoActivoId || !notaContenido.trim()) return;
    setGuardandoNota(true);
    try {
      const nueva = await ordenServicioService.crearNota(
        id,
        equipoActivoId,
        notaContenido.trim()
      );
      setNotas((prev) => [...prev, nueva]);
      setNotaContenido('');
    } catch {
      //
    } finally {
      setGuardandoNota(false);
    }
  }

  async function handleQuitarItem(itemId: string) {
    if (!id) return;
    try {
      const updated = await ordenServicioService.quitarItem(id, itemId);
      setOrden(updated);
    } catch {
      //
    }
  }

  async function handleGuardarCantidad(item: import('@/types').ItemOrden, cantidad?: number) {
    if (!id) return;
    const nuevaCantidad = cantidad ?? (
      editandoCantidad?.itemId === item.id
        ? Number.parseInt(editandoCantidad.valor)
        : item.cantidad
    );
    if (!nuevaCantidad || nuevaCantidad < 1) {
      setCantidadError('Ingresa una cantidad válida.');
      setEditandoCantidad({ itemId: item.id, valor: String(nuevaCantidad) });
      return;
    }
    if (nuevaCantidad === item.cantidad) {
      setEditandoCantidad(null);
      return;
    }
    // Validar stock para productos físicos en el cliente antes de enviar
    if (item.producto && !item.producto.esServicio) {
      const stockDisponible = item.producto.stockActual + item.cantidad;
      if (nuevaCantidad > stockDisponible) {
        setCantidadError(`Stock insuficiente. Disponible: ${stockDisponible}`);
        setEditandoCantidad({ itemId: item.id, valor: String(nuevaCantidad) });
        return;
      }
    }
    setGuardandoCantidad(true);
    try {
      const updated = await ordenServicioService.actualizarItemCantidad(id, item.id, nuevaCantidad);
      setOrden(updated);
      setEditandoCantidad(null);
      setCantidadError(null);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'No se pudo actualizar la cantidad.';
      setCantidadError(msg);
      setEditandoCantidad({ itemId: item.id, valor: String(nuevaCantidad) });
    } finally {
      setGuardandoCantidad(false);
    }
  }

  // Dialog agregar ítem
  async function buscarProductos(q: string) {
    setBuscandoProductos(true);
    try {
      const res = await productoService.getAll({ busqueda: q, take: 20 });
      setProductos(res.productos);
    } catch {
      setProductos([]);
    } finally {
      setBuscandoProductos(false);
    }
  }

  function abrirItemDialog() {
    setItemForm({ productoId: '', productoNombre: '', cantidad: '1', precioUnitario: '' });
    setItemError(null);
    setBusquedaProducto('');
    setProductos([]);
    setItemDialogOpen(true);
  }

  async function handleAgregarItem() {
    if (!id || !equipoActivoId) return;
    if (!itemForm.productoId) {
      setItemError('Selecciona un producto.');
      return;
    }
    // Bloquear si el producto ya está registrado en este equipo
    const duplicado = equipoActivo?.items?.some((it) => it.productoId === itemForm.productoId);
    if (duplicado) {
      setItemError('Este producto ya está registrado. Ajuste la cantidad.');
      return;
    }
    const cant = parseInt(itemForm.cantidad);
    const precio = parseFloat(itemForm.precioUnitario);
    if (!cant || cant < 1) {
      setItemError('Cantidad inválida.');
      return;
    }
    if (!precio || precio <= 0) {
      setItemError('Precio inválido.');
      return;
    }
    setGuardandoItem(true);
    try {
      const payload: AgregarItemOrdenDto = {
        productoId: itemForm.productoId,
        cantidad: cant,
        precioUnitario: precio,
      };
      const updated = await ordenServicioService.agregarItem(
        id,
        equipoActivoId,
        payload
      );
      setOrden(updated);
      setItemDialogOpen(false);
    } catch {
      setItemError('No se pudo agregar el ítem.');
    } finally {
      setGuardandoItem(false);
    }
  }

  // Dialog agregar equipo
  async function abrirAgregarEquipoDialog() {
    if (!orden?.clienteId) return;
    setEquipoEntrada({ ...EQUIPO_ENTRADA_VACIO });
    setMostrarFormEquipoNuevo(false);
    setFormNuevoEquipo({ ...EQUIPO_NUEVO_VACIO });
    setEntradaEquipoError(null);
    setAgregarEquipoDialogOpen(true);
    try {
      const cli = await clienteService.getById(orden.clienteId);
      const idsEnOrden = new Set(orden.equipos?.map((e) => e.equipoId) ?? []);
      setEquiposCliente((cli.equipos ?? []).filter((eq) => !idsEnOrden.has(eq.id)));
    } catch {
      setEquiposCliente([]);
    }
  }

  async function handleCrearEquipoInline() {
    if (!orden?.clienteId) return;
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
    try {
      const eq = await clienteService.crearEquipo(orden.clienteId, {
        tipoEquipo: formNuevoEquipo.tipoEquipo.trim(),
        marca: formNuevoEquipo.marca || null,
        modelo: formNuevoEquipo.modelo || null,
        numeroSerie: formNuevoEquipo.numeroSerie || null,
        contrasenaPatron: formNuevoEquipo.contrasenaPatron?.trim() || null,
      });
      setEquiposCliente((prev) => [...prev, eq]);
      setEquipoEntrada((prev) => ({ ...prev, equipoId: eq.id }));
      setMostrarFormEquipoNuevo(false);
      setFormNuevoEquipo({ ...EQUIPO_NUEVO_VACIO });
      setErrorNuevoEquipo(null);
    } catch {
      setErrorNuevoEquipo('No se pudo registrar el equipo.');
    } finally {
      setSubmittingNuevoEquipo(false);
    }
  }

  async function handleConfirmarAgregarEquipo() {
    if (!id) return;
    if (!equipoEntrada.equipoId) {
      setEntradaEquipoError('Selecciona un equipo.');
      return;
    }
    if (!equipoEntrada.problemaReportado.trim()) {
      setEntradaEquipoError('El problema reportado es obligatorio.');
      return;
    }
    setAgregarEquipoLoading(true);
    try {
      const payload: EquipoOrdenInputDto = {
        equipoId: equipoEntrada.equipoId,
        problemaReportado: equipoEntrada.problemaReportado.trim(),
        diagnosticoTecnico: equipoEntrada.diagnosticoTecnico || null,
        costoEstimado: equipoEntrada.costoEstimado
          ? parseFloat(equipoEntrada.costoEstimado)
          : null,
      };
      const updated = await ordenServicioService.agregarEquipo(id, payload);
      setOrden(updated);
      const nuevoId = updated.equipos?.find(
        (e) => e.equipoId === equipoEntrada.equipoId
      )?.id;
      if (nuevoId) setEquipoActivoId(nuevoId);
      setAgregarEquipoDialogOpen(false);
    } catch {
      setEntradaEquipoError('No se pudo agregar el equipo.');
    } finally {
      setAgregarEquipoLoading(false);
    }
  }

  // Render: Estados de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !orden) {
    return (
      <div className="p-8 space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error ?? 'Orden no encontrada.'}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => navigate('/ordenes-servicio')}>
          Volver al listado
        </Button>
      </div>
    );
  }

  // ── render principal ───────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

      {/* SIDEBAR */}
      <aside className="w-64 shrink-0 flex flex-col border-r bg-card overflow-hidden">

        {/* Encabezado OS */}
        <div className="p-4 border-b shrink-0">
          <div className="flex items-center gap-2 mb-1.5">
            <WrenchIcon className="h-4 w-4 text-muted-foreground" />
            <span className="font-bold text-sm">{orden.codigoFormateado}</span>
          </div>
          <EstadoBadge estado={orden.estado} />
          <p className="text-xs text-muted-foreground mt-1.5">
            {new Date(orden.fechaEmision).toLocaleDateString('es-PE', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>

        {/* Lista de equipos */}
        <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 py-1 mb-1">
            Equipos en esta orden
          </p>

          {orden.equipos?.map((eq) => {
            const activo = eq.id === equipoActivoId;
            const cfg = ESTADO_EQUIPO_CONFIG[eq.estado];
            return (
              <button
                key={eq.id}
                onClick={() => setEquipoActivoId(eq.id)}
                className={cn(
                  'w-full text-left flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors',
                  activo
                    ? 'bg-primary/10 text-primary font-semibold border-l-2 border-primary rounded-l-none'
                    : 'hover:bg-muted text-foreground'
                )}
              >
                <Laptop className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="truncate font-medium leading-snug">
                    {eq.equipo?.tipoEquipo ?? '—'}
                  </p>
                  {(eq.equipo?.marca || eq.equipo?.modelo) && (
                    <p className="text-xs text-muted-foreground truncate">
                      {[eq.equipo.marca, eq.equipo.modelo].filter(Boolean).join(' ')}
                    </p>
                  )}
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 text-[10px] font-medium mt-0.5',
                      cfg.className
                        .split(' ')
                        .filter((c) => c.startsWith('text-'))
                        .join(' ')
                    )}
                  >
                    {cfg.icon}
                    {cfg.label}
                  </span>
                </div>
              </button>
            );
          })}

          {orden.estado !== 'ENTREGADA' && orden.estado !== 'CANCELADA' && (
            <button
              onClick={abrirAgregarEquipoDialog}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-primary italic transition-colors mt-1"
            >
              <Plus className="h-4 w-4" />
              Agregar otro equipo
            </button>
          )}
        </div>

        <Separator />

        {/* Info cliente */}
        <div className="p-3 space-y-2 shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
            Cliente
          </p>
          <div className="flex items-center gap-2 px-1">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{orden.cliente?.nombre}</p>
              {orden.cliente?.telefono && (
                <p className="text-xs text-muted-foreground">{orden.cliente.telefono}</p>
              )}
            </div>
          </div>
          {orden.cliente?.telefono && (
            <a
              href={`https://wa.me/51${orden.cliente.telefono.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-bold transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          )}
          <Link
            to="/clientes"
            className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-muted hover:bg-muted/70 text-xs font-semibold transition-colors"
          >
            Ver todos los clientes
          </Link>
        </div>

        <Separator />

        {/* Técnico asignado */}
        <div className="p-3 shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-1 mb-2">
            Técnico asignado
          </p>
          <Select
            value={orden.usuarioTecnicoId ?? 'none'}
            onValueChange={handleGuardarTecnico}
            disabled={
              guardandoTecnico ||
              orden.estado === 'ENTREGADA' ||
              orden.estado === 'CANCELADA'
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Sin asignar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin asignar</SelectItem>
              {usuarios.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.nombreCompleto}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </aside>

      {/* PANEL CENTRAL */}
      <main className="flex-1 overflow-y-auto bg-background">

        {/* Header sticky */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-3 flex items-center justify-between gap-4">
          <div>
            <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
              <Link to="/ordenes-servicio" className="hover:text-foreground transition-colors">
                Órdenes
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">{orden.codigoFormateado}</span>
            </nav>
            <h1 className="text-xl font-bold leading-tight">
              {equipoActivo
                ? [
                    equipoActivo.equipo?.tipoEquipo,
                    equipoActivo.equipo?.marca,
                    equipoActivo.equipo?.modelo,
                  ]
                    .filter(Boolean)
                    .join(' ')
                : orden.codigoFormateado}
            </h1>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={descargandoPDF}
              onClick={() => handleDownloadPDF(false)}
            >
              {descargandoPDF ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-1.5" />
              )}
              PDF global
            </Button>
            {equipoActivo && (
              <Button
                variant="outline"
                size="sm"
                disabled={descargandoPDF}
                onClick={() => handleDownloadPDF(true)}
              >
                {descargandoPDF ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-1.5" />
                )}
                PDF equipo
              </Button>
            )}
          </div>
        </div>

        {!equipoActivo ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Selecciona un equipo del panel izquierdo.
          </div>
        ) : (
          <div className="p-6 space-y-6 w-full">

            {/* 1. Estado del equipo */}
            <div className="rounded-xl border bg-card px-5 py-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <EquipoBadge estado={equipoActivo.estado} />
                  {equipoActivo.costoEstimado && (
                    <span className="text-sm text-muted-foreground">
                      Costo estimado:{' '}
                      <span className="font-semibold text-foreground">
                        S/ {fmt(equipoActivo.costoEstimado)}
                      </span>
                    </span>
                  )}
                </div>

                {TRANSICIONES[equipoActivo.estado].length > 0 &&
                  orden.estado !== 'ENTREGADA' && (
                    <div className="flex gap-2">
                      {TRANSICIONES[equipoActivo.estado].map((sig) => (
                        <Button
                          key={sig}
                          size="sm"
                          variant={sig === 'CANCELADA' ? 'destructive' : 'default'}
                          disabled={cambiandoEstadoEquipo}
                          onClick={() => handleSolicitarCambioEstado(sig)}
                          className="text-xs"
                        >
                          {cambiandoEstadoEquipo && (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          )}
                          {getTransicionLabel(equipoActivo.estado, sig)}
                        </Button>
                      ))}
                    </div>
                  )}
              </div>
            </div>

            {/* 2. Detalles del servicio */}
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  Detalles del servicio
                </h2>
                {!editandoEquipo ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 h-7 text-xs"
                    onClick={() => setEditandoEquipo(true)}
                    disabled={
                      orden.estado === 'ENTREGADA' || orden.estado === 'CANCELADA'
                    }
                  >
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 h-7 text-xs"
                      onClick={() => setEditandoEquipo(false)}
                    >
                      <X className="h-3 w-3" /> Cancelar
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 h-7 text-xs"
                      onClick={handleGuardarEquipo}
                      disabled={guardandoEquipo}
                    >
                      {guardandoEquipo ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                      Guardar
                    </Button>
                  </div>
                )}
              </div>

              <div className="p-5 grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Problema reportado
                  </label>
                  {editandoEquipo ? (
                    <Textarea
                      rows={4}
                      value={formEquipo.problemaReportado ?? ''}
                      onChange={(e) =>
                        setFormEquipo((p) => ({
                          ...p,
                          problemaReportado: e.target.value,
                        }))
                      }
                      className="text-sm resize-none"
                    />
                  ) : (
                    <p className="text-sm bg-muted/40 rounded-lg p-3 min-h-[5rem] leading-relaxed">
                      {equipoActivo.problemaReportado}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Diagnóstico técnico
                  </label>
                  {editandoEquipo ? (
                    <Textarea
                      rows={4}
                      value={String(formEquipo.diagnosticoTecnico ?? '')}
                      onChange={(e) =>
                        setFormEquipo((p) => ({
                          ...p,
                          diagnosticoTecnico: e.target.value,
                        }))
                      }
                      placeholder="Diagnóstico preliminar..."
                      className="text-sm resize-none"
                    />
                  ) : (
                    <p className="text-sm bg-blue-50/60 dark:bg-blue-900/10 rounded-lg p-3 min-h-[5rem] leading-relaxed text-muted-foreground italic">
                      {equipoActivo.diagnosticoTecnico ?? 'Sin diagnóstico registrado.'}
                    </p>
                  )}
                </div>

                {editandoEquipo && (
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">
                      Costo estimado (S/)
                    </label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={costoEstimadoStr}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^\d*\.?\d*$/.test(value)) {
                          setCostoEstimadoStr(value);
                        }
                      }}
                      placeholder="0.00"
                      className="max-w-xs"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 3. Repuestos y Mano de Obra ── */}
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <PackageCheck className="h-4 w-4 text-primary" />
                  Repuestos y Mano de Obra
                </h2>
                {orden.estado !== 'ENTREGADA' && orden.estado !== 'CANCELADA' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 h-7 text-xs"
                    onClick={abrirItemDialog}
                  >
                    <Plus className="h-3 w-3" /> Agregar ítem
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 text-xs font-semibold uppercase text-muted-foreground">
                      <th className="px-5 py-3 text-left">Descripción</th>
                      <th className="px-5 py-3 text-center">Cant.</th>
                      <th className="px-5 py-3 text-right">P. Unitario</th>
                      <th className="px-5 py-3 text-right">Subtotal</th>
                      <th className="px-2 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(equipoActivo.items ?? []).length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-8 text-center text-muted-foreground text-xs italic"
                        >
                          Sin ítems. Agrega repuestos o mano de obra.
                        </td>
                      </tr>
                    ) : (
                      equipoActivo.items!.map((item) => {
                        const esServicio = item.producto?.esServicio ?? false;
                        const stockDisponible = esServicio
                          ? null
                          : (item.producto?.stockActual ?? 0) + item.cantidad;
                        return (
                          <tr key={item.id} className="hover:bg-muted/20">
                            <td className="px-5 py-3 font-medium">
                              {item.producto?.nombre ?? '—'}
                              {esServicio && (
                                <span className="ml-1.5 text-[10px] text-muted-foreground border rounded px-1">
                                  servicio
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {orden.estado !== 'ENTREGADA' && orden.estado !== 'CANCELADA' ? (
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleGuardarCantidad(item, item.cantidad - 1)}
                                      disabled={guardandoCantidad || item.cantidad <= 1}
                                      className="h-6 w-6 rounded flex items-center justify-center bg-muted hover:bg-muted-foreground/20 transition-colors disabled:opacity-40"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </button>
                                    <input
                                      type="text"
                                      value={editandoCantidad?.itemId === item.id ? editandoCantidad.valor : String(item.cantidad)}
                                      onChange={(e) => {
                                        setEditandoCantidad({ itemId: item.id, valor: e.target.value });
                                        setCantidadError(null);
                                      }}
                                      onBlur={() => {
                                        if (editandoCantidad?.itemId === item.id) handleGuardarCantidad(item);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && editandoCantidad?.itemId === item.id) handleGuardarCantidad(item);
                                        if (e.key === 'Escape') { setEditandoCantidad(null); setCantidadError(null); }
                                      }}
                                      className="w-10 text-center text-sm border border-border rounded bg-background py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    <button
                                      onClick={() => handleGuardarCantidad(item, item.cantidad + 1)}
                                      disabled={guardandoCantidad || (stockDisponible !== null && item.cantidad >= stockDisponible)}
                                      className="h-6 w-6 rounded flex items-center justify-center bg-muted hover:bg-muted-foreground/20 transition-colors disabled:opacity-40"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </button>
                                  </div>
                                  {stockDisponible !== null && (
                                    <span className="text-[10px] text-muted-foreground">Máx: {stockDisponible}</span>
                                  )}
                                  {cantidadError && editandoCantidad?.itemId === item.id && (
                                    <span className="text-[10px] text-destructive max-w-[10rem] text-center">{cantidadError}</span>
                                  )}
                                </div>
                              ) : (
                                item.cantidad
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              S/ {fmt(item.precioUnitario)}
                            </td>
                            <td className="px-5 py-3 text-right font-semibold">
                              S/ {fmt(item.subtotal)}
                            </td>
                            <td className="px-2 py-3 text-center">
                              {orden.estado !== 'ENTREGADA' &&
                                orden.estado !== 'CANCELADA' && (
                                  <button
                                    onClick={() => handleQuitarItem(item.id)}
                                    className="text-muted-foreground hover:text-destructive transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {(equipoActivo.items ?? []).length > 0 && (
                    <tfoot>
                      <tr className="bg-muted/20">
                        <td
                          colSpan={3}
                          className="px-5 py-3 text-sm font-semibold text-right"
                        >
                          Total para este equipo:
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-base">
                          S/ {fmt(equipoActivo.subtotal)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* 4. Notas técnicas internas */}
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-primary" />
                  Notas técnicas internas
                </h2>
              </div>

              <div className="p-5 space-y-4">
                {notas.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Sin notas registradas.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {notas.map((nota) => (
                      <div
                        key={nota.id}
                        className="bg-muted/30 rounded-lg p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-medium">
                            {nota.usuario?.nombreCompleto ?? nota.usuarioId}
                          </span>
                          <span>
                            {new Date(nota.createdAt).toLocaleString('es-PE', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{nota.contenido}</p>
                      </div>
                    ))}
                  </div>
                )}

                {orden.estado !== 'ENTREGADA' && orden.estado !== 'CANCELADA' && (
                  <div className="space-y-2">
                    <Textarea
                      rows={3}
                      value={notaContenido}
                      onChange={(e) => setNotaContenido(e.target.value)}
                      placeholder="Añadir observaciones internas sobre la reparación..."
                      className="text-sm resize-none"
                    />
                    <p className="text-[11px] text-muted-foreground italic">
                      Estas notas no se muestran en el ticket del cliente.
                    </p>
                    <Button
                      size="sm"
                      onClick={handleAgregarNota}
                      disabled={!notaContenido.trim() || guardandoNota}
                    >
                      {guardandoNota && (
                        <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                      )}
                      Agregar nota
                    </Button>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </main>

      {/* PANEL DERECHO */}
      <aside className="w-85 shrink-0 border-l overflow-y-auto bg-card">

        {/* Header */}
        <div className="bg-primary text-primary-foreground px-5 py-4 sticky top-0 z-10">
          <h3 className="font-bold text-base flex items-center gap-2">
            <PackageCheck className="h-4 w-4" />
            Resumen Económico
          </h3>
          <p className="text-xs text-primary-foreground/60 mt-0.5">
            TOTAL CONSOLIDADO DE LA ORDEN
          </p>
        </div>

        <div className="p-5 space-y-4">

          {/* Breakdown por equipo */}
          {(orden.equipos ?? []).length > 0 && (
            <div className="space-y-1">
              {orden.equipos!.map((eq) => {
                const sub = parseFloat(eq.subtotal ?? '0');
                const activo = eq.id === equipoActivoId;
                return (
                  <div
                    key={eq.id}
                    onClick={() => setEquipoActivoId(eq.id)}
                    className={cn(
                      'flex items-center justify-between text-xs py-1.5 px-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors',
                      activo && 'bg-muted/60 font-semibold'
                    )}
                  >
                    <span className="truncate text-muted-foreground max-w-[9.5rem]">
                      {[eq.equipo?.tipoEquipo, eq.equipo?.marca]
                        .filter(Boolean)
                        .join(' ')}
                    </span>
                    <span className="font-semibold shrink-0 ml-2">
                      S/ {fmt(sub)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <Separator />

          {/* Totales */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">S/ {fmt(subtotalOS)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Pago a cuenta</span>
              {editandoPago ? (
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1">
                    <Input
                      type="text"
                      min="0"
                      value={pagoInput}
                      onChange={(e) => {
                        setPagoInput(e.target.value);
                        setPagoError(null);
                      }}
                      className="h-6 w-24 text-xs text-right"
                      autoFocus
                    />
                    <button
                      onClick={handleGuardarPago}
                      disabled={guardandoPago}
                      className="text-green-600 hover:text-green-700"
                    >
                      {guardandoPago ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => { setEditandoPago(false); setPagoError(null); }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {pagoError && (
                    <p className="text-[10px] text-destructive max-w-[12rem] text-right leading-tight">{pagoError}</p>
                  )}
                </div>
              ) : (
                <button
                  className="font-semibold hover:underline text-sm"
                  onClick={() => {
                    setPagoInput(fmt(pagoACuenta));
                    setEditandoPago(true);
                  }}
                  disabled={orden.estado === 'ENTREGADA'}
                  title="Clic para editar"
                >
                  S/ {fmt(pagoACuenta)}
                </button>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-end pt-1">
            <span className="font-black text-sm">SALDO</span>
            <p
              className={cn(
                'text-2xl font-black',
                saldoPendiente > 0 ? 'text-destructive' : 'text-green-600'
              )}
            >
              S/ {fmt(saldoPendiente)}
            </p>
          </div>

          {pagoACuenta > subtotalOS && (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
              <AlertCircle className="h-3 w-3 shrink-0" />
              El pago a cuenta (S/ {fmt(pagoACuenta)}) no puede superar el total (S/ {fmt(subtotalOS)}).
            </p>
          )}

          {saldoPendiente === 0 && subtotalOS > 0 && pagoACuenta <= subtotalOS && (
            <p className="text-xs text-green-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Pagado completo
            </p>
          )}

          {saldoPendiente > 0 && (
            <div className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-50 dark:bg-red-900/10">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold text-red-600 dark:text-red-400">
                PAGO PENDIENTE
              </span>
            </div>
          )}

          <Separator />

          {/* Botón ENTREGADA */}
          {orden.estado === 'LISTA' && (
            <>
              <Button
                className="w-full gap-2"
                disabled={!puedeEntregarSe || marcandoEntregada}
                onClick={handleMarcarEntregada}
              >
                {marcandoEntregada ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Marcar como Entregada
              </Button>
              {saldoPendiente > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Registra el pago completo para poder entregar la orden.
                </p>
              )}
            </>
          )}

          {orden.estado === 'ENTREGADA' && (
            <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-green-50 dark:bg-green-900/10">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-bold text-green-600 dark:text-green-400">
                ENTREGADA
              </span>
            </div>
          )}

          {orden.estado === 'CANCELADA' && (
            <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/10">
              <X className="h-4 w-4 text-red-600" />
              <span className="text-sm font-bold text-red-600 dark:text-red-400">
                CANCELADA
              </span>
            </div>
          )}

        </div>
      </aside>

      {/* DIALOG: Agregar ítem */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar ítem</DialogTitle>
            <DialogDescription>
              Selecciona un repuesto o servicio del inventario para este equipo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Producto / Servicio</label>
              <Input
                placeholder="Escribe al menos 2 caracteres..."
                value={busquedaProducto}
                onChange={(e) => {
                  const q = e.target.value;
                  setBusquedaProducto(q);
                  if (q.length >= 2) buscarProductos(q);
                  else setProductos([]);
                }}
              />
              <div className="border rounded-md max-h-44 overflow-y-auto">
                {buscandoProductos ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : productos.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic p-3">
                    {busquedaProducto
                      ? 'Sin resultados.'
                      : 'Escribe para buscar...'}
                  </p>
                ) : (
                  productos.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        const duplicado = equipoActivo?.items?.some(
                          (it) => it.productoId === p.id
                        );
                        setItemForm((prev) => ({
                          ...prev,
                          productoId: p.id,
                          productoNombre: p.nombre,
                          precioUnitario: String(p.precioVenta),
                        }));
                        setBusquedaProducto(p.nombre);
                        setProductos([]);
                        if (duplicado) {
                          setItemError('Este producto ya está registrado. Ajuste la cantidad.');
                        } else {
                          setItemError(null);
                        }
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors border-b last:border-b-0 flex items-center justify-between gap-2',
                        itemForm.productoId === p.id && 'bg-primary/10 text-primary'
                      )}
                    >
                      <div className="min-w-0">
                        <span className="font-medium">{p.nombre}</span>
                        {p.esServicio && (
                          <span className="ml-1 text-[10px] text-muted-foreground border rounded px-1">
                            servicio
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        S/ {fmt(p.precioVenta)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cantidad</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={itemForm.cantidad}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value)) {
                      setItemForm((p) => ({ ...p, cantidad: value }));
                    }
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Precio unitario (S/)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemForm.precioUnitario}
                  disabled
                  className="bg-muted/50 cursor-not-allowed"
                />
              </div>
            </div>

            {itemForm.productoId && itemForm.cantidad && itemForm.precioUnitario && (
              <p className="text-sm text-muted-foreground">
                Subtotal:{' '}
                <span className="font-semibold text-foreground">
                  S/{' '}
                  {fmt(
                    parseInt(itemForm.cantidad) * parseFloat(itemForm.precioUnitario)
                  )}
                </span>
              </p>
            )}

            {itemError && (
              <Alert variant="destructive">
                <AlertDescription className="text-sm">{itemError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAgregarItem} disabled={guardandoItem}>
              {guardandoItem && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              <Plus className="h-4 w-4 mr-1.5" />
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Agregar otro equipo */}
      <Dialog
        open={agregarEquipoDialogOpen}
        onOpenChange={setAgregarEquipoDialogOpen}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Agregar equipo a la orden</DialogTitle>
            <DialogDescription>
              Selecciona un equipo del cliente y describe el problema reportado.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6 mt-2 overflow-hidden flex-1 min-h-0">

            {/* Columna izquierda: selección */}
            <div className="flex flex-col gap-3 overflow-hidden">
              <label className="text-sm font-medium shrink-0">
                Equipo <span className="text-destructive">*</span>
              </label>
              <div className="flex-1 overflow-y-auto min-h-0 border rounded-md">
                {equiposCliente.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic p-3">
                    Todos los equipos del cliente ya están en esta orden, o no tiene equipos registrados. Registra uno nuevo abajo.
                  </p>
                ) : (
                  equiposCliente.map((eq) => (
                    <button
                      type="button"
                      key={eq.id}
                      onClick={() =>
                        setEquipoEntrada((p) => ({ ...p, equipoId: eq.id }))
                      }
                      className={cn(
                        'w-full text-left px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors flex items-start gap-2 border-b last:border-b-0',
                        equipoEntrada.equipoId === eq.id &&
                          'bg-primary/10 text-primary font-medium'
                      )}
                    >
                      <Laptop className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium">{eq.tipoEquipo}</span>
                        {(eq.marca || eq.modelo) && (
                          <span className="text-muted-foreground font-normal">
                            {' '}
                            {[eq.marca, eq.modelo].filter(Boolean).join(' ')}
                          </span>
                        )}
                        {eq.numeroSerie && (
                          <p className="text-xs text-muted-foreground font-mono">
                            S/N: {eq.numeroSerie}
                          </p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {!mostrarFormEquipoNuevo ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5 text-xs h-8"
                  onClick={() => setMostrarFormEquipoNuevo(true)}
                >
                  <Plus className="h-3.5 w-3.5" /> Registrar nuevo equipo
                </Button>
              ) : (
                <div className="border rounded-md p-3 space-y-2 bg-muted/20 shrink-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">Nuevo equipo</p>
                    <button
                      type="button"
                      onClick={() => {
                        setMostrarFormEquipoNuevo(false);
                        setFormNuevoEquipo({ ...EQUIPO_NUEVO_VACIO });
                        setErrorNuevoEquipo(null);
                      }}
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Tipo de equipo <span className="text-destructive">*</span></label>
                    <Input
                      value={formNuevoEquipo.tipoEquipo}
                      onChange={(e) =>
                        setFormNuevoEquipo((p) => ({
                          ...p,
                          tipoEquipo: e.target.value,
                        }))
                      }
                      placeholder="Laptop, Celular, PC..."
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Marca <span className="text-destructive">*</span></label>
                      <Input
                        value={formNuevoEquipo.marca}
                        onChange={(e) =>
                          setFormNuevoEquipo((p) => ({ ...p, marca: e.target.value }))
                        }
                        placeholder="HP, Samsung..."
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Modelo <span className="text-destructive">*</span></label>
                      <Input
                        value={formNuevoEquipo.modelo}
                        onChange={(e) =>
                          setFormNuevoEquipo((p) => ({
                            ...p,
                            modelo: e.target.value,
                          }))
                        }
                        placeholder="Pavilion, A15..."
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">N de serie <span className="text-destructive">*</span></label>
                      <Input
                        value={formNuevoEquipo.numeroSerie}
                        onChange={(e) =>
                          setFormNuevoEquipo((p) => ({
                            ...p,
                            numeroSerie: e.target.value,
                          }))
                        }
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
                          onChange={(e) =>
                            setFormNuevoEquipo((p) => ({
                              ...p,
                              contrasenaPatron: e.target.value,
                            }))
                          }
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
                      <AlertDescription className="text-xs">
                        {errorNuevoEquipo}
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={() => {
                        setMostrarFormEquipoNuevo(false);
                        setFormNuevoEquipo({ ...EQUIPO_NUEVO_VACIO });
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
                      {submittingNuevoEquipo && (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      )}
                      Guardar
                    </Button>
                  </div>
                </div>
              )}

              {equipoEntrada.equipoId && (
                <p className="text-xs text-green-600 font-medium shrink-0">
                  ✓{' '}
                  {(() => {
                    const eq = equiposCliente.find(
                      (e) => e.id === equipoEntrada.equipoId
                    );
                    return eq
                      ? [eq.tipoEquipo, eq.marca, eq.modelo]
                          .filter(Boolean)
                          .join(' ')
                      : '';
                  })()}
                </p>
              )}
            </div>

            {/* Columna derecha: descripción */}
            <div className="flex flex-col gap-4 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Problema reportado{' '}
                  <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={equipoEntrada.problemaReportado}
                  onChange={(e) =>
                    setEquipoEntrada((p) => ({
                      ...p,
                      problemaReportado: e.target.value,
                    }))
                  }
                  placeholder="Describir el problema..."
                  rows={5}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Diagnóstico técnico</label>
                <Textarea
                  value={equipoEntrada.diagnosticoTecnico}
                  onChange={(e) =>
                    setEquipoEntrada((p) => ({
                      ...p,
                      diagnosticoTecnico: e.target.value,
                    }))
                  }
                  placeholder="Diagnóstico preliminar (opcional)..."
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Costo estimado (S/)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={equipoEntrada.costoEstimado}
                  onChange={(e) =>
                    setEquipoEntrada((p) => ({
                      ...p,
                      costoEstimado: e.target.value,
                    }))
                  }
                  placeholder="0.00"
                />
              </div>
              {entradaEquipoError && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">
                    {entradaEquipoError}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 mt-4 shrink-0 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setAgregarEquipoDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarAgregarEquipo}
              disabled={agregarEquipoLoading}
            >
              {agregarEquipoLoading && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              <Plus className="h-4 w-4 mr-1.5" />
              Agregar a la Orden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Confirmación cambio de estado */}
      <AlertDialog
        open={confirmEstado.open}
        onOpenChange={(open) =>
          setConfirmEstado((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmEstado.titulo}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmEstado.descripcion}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={
                confirmEstado.estado === 'CANCELADA'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : undefined
              }
              onClick={() => {
                if (confirmEstado.estado) {
                  handleCambiarEstadoEquipo(confirmEstado.estado);
                }
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
