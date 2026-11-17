import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboard } from '@/hooks/useDashboard';
import { useLocal } from '@/hooks/useLocal';
import { queryKeys } from '@/lib/queryClient';
import { AlertCircle, Globe, Loader2, RefreshCw, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Pagination } from '@/components/Pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AjustarStockDialog } from '@/components/AjustarStockDialog';
import type { Producto } from '@/types';
import type { ProductoBajoStock } from '@/services/dashboard.service';

const MESES = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

const formatCurrency = (value: number) =>
  `S/ ${value.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function Dashboard() {
  const queryClient = useQueryClient();
  const {
    metrics,
    bajoStock,
    sinMovimiento,
    loading,
    loadingSinMovimiento,
    error,
    diasSinMovimiento,
    setDiasSinMovimiento,
    mes,
    setMes,
    anio,
    setAnio,
    localId,
    setLocalId,
    refetch,
  } = useDashboard();

  const { locales } = useLocal();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const currentYear = new Date().getFullYear();
  const aniosDisponibles = Array.from(
    new Set([currentYear, currentYear - 1, currentYear - 2, currentYear - 3, anio])
  ).sort((a, b) => b - a);

  // Paginación para Stock Crítico
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = bajoStock.slice(indexOfFirstItem, indexOfLastItem);

  const handleAjustarStock = (producto: ProductoBajoStock) => {
    setProductoSeleccionado(producto as Producto);
    setDialogOpen(true);
  };

  const handleStockSuccess = () => {
    setDialogOpen(false);
    setProductoSeleccionado(null);
    refetch();
    void queryClient.invalidateQueries({ queryKey: queryKeys.productos() });
  };

  const getTrendIcon = (variation: number | null) => {
    if (variation === null || variation === 0) return 'trending_flat';
    return variation > 0 ? 'trending_up' : 'trending_down';
  };

  const getTrendClass = (variation: number | null) => {
    if (variation === null || variation === 0) return 'text-muted-foreground';
    return variation > 0 ? 'text-success' : 'text-destructive';
  };

  const formatVariation = (variation: number | null) => {
    if (variation === null) return 'Nuevo';
    if (variation === 0) return '0%';
    return `${variation > 0 ? '+' : ''}${variation.toFixed(1)}%`;
  };

  const selectedLocalLabel =
    localId === 'all'
      ? 'Todos los locales'
      : localId === 'WEB'
        ? 'Tienda Web'
        : locales.find((l) => l.id === localId)?.nombre ?? 'Local seleccionado';

  const selectedMesLabel = MESES.find((m) => m.value === mes)?.label ?? String(mes);

  // Fecha actual formateada
  const fechaHoy = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  if (loading && !metrics) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section + Filtros */}
      <div className="flex flex-col xl:flex-row xl:justify-between xl:items-end gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Resumen del Negocio
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Rendimiento mensual por tienda y operación diaria en tiempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filtro Mes */}
          <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
            <SelectTrigger aria-label="Filtrar por mes" className="w-[135px] h-9 bg-card text-sm">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro Año */}
          <Select value={String(anio)} onValueChange={(v) => setAnio(Number(v))}>
            <SelectTrigger aria-label="Filtrar por año" className="w-[100px] h-9 bg-card text-sm">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {aniosDisponibles.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro Local */}
          <Select value={localId} onValueChange={setLocalId}>
            <SelectTrigger aria-label="Filtrar por local" className="w-[185px] h-9 bg-card text-sm">
              <SelectValue placeholder="Todos los locales" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los locales</SelectItem>
              {locales.map((local) => (
                <SelectItem key={local.id} value={local.id}>
                  {local.nombre}
                </SelectItem>
              ))}
              <SelectItem value="WEB">Tienda Web</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={loading}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Actualizar
          </Button>

          <div className="flex items-center gap-2 px-3 h-9 bg-card rounded-md border border-border text-sm font-medium text-foreground shadow-sm">
            <span className="material-symbols-outlined text-[16px] text-muted-foreground">
              calendar_today
            </span>
            <span>{fechaHoy}</span>
          </div>
        </div>
      </div>

      {/* Banner de error visible con botón de reintento */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
            <div>
              <AlertTitle>Error al cargar métricas</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              className="shrink-0 bg-background text-foreground hover:bg-muted"
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Reintentar
            </Button>
          </div>
        </Alert>
      )}

      {metrics && (
        <>
          {/* Resumen Mensual */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  Resumen Mensual — {selectedMesLabel} {anio}
                </h3>
                <Badge variant="secondary" className="font-medium">
                  {selectedLocalLabel}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Comparación automática contra el mes anterior
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Ingresos del Mes */}
              <div className="bg-card p-5 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-sm font-medium text-muted-foreground">Ingresos del Mes</p>
                  <span className="material-symbols-outlined text-muted-foreground text-[20px]">
                    trending_up
                  </span>
                </div>
                <h4 className="text-2xl font-bold text-foreground">
                  {formatCurrency(metrics.resumenMensual.ingresosTotales)}
                </h4>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <span
                    className={cn(
                      'font-medium flex items-center mr-1',
                      getTrendClass(metrics.resumenMensual.variacionIngresosPct)
                    )}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {getTrendIcon(metrics.resumenMensual.variacionIngresosPct)}
                    </span>
                    {' '}{formatVariation(metrics.resumenMensual.variacionIngresosPct)}
                  </span>
                  <span>vs. mes anterior</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 truncate">
                  Ventas {formatCurrency(metrics.resumenMensual.ingresosVentas)} · OS{' '}
                  {formatCurrency(metrics.resumenMensual.ingresosOrdenes)}
                </p>
              </div>

              {/* Ganancia Real del Mes */}
              <div className="bg-card p-5 rounded-xl border border-primary/30 shadow-sm hover:shadow-md transition-shadow ring-1 ring-primary/10">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-sm font-semibold text-primary">Ganancia Real del Mes</p>
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    account_balance_wallet
                  </span>
                </div>
                <h4 className="text-2xl font-bold text-foreground">
                  {formatCurrency(metrics.resumenMensual.gananciaTotal)}
                </h4>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <span
                    className={cn(
                      'font-medium flex items-center mr-1',
                      getTrendClass(metrics.resumenMensual.variacionGananciaPct)
                    )}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {getTrendIcon(metrics.resumenMensual.variacionGananciaPct)}
                    </span>
                    {' '}{formatVariation(metrics.resumenMensual.variacionGananciaPct)}
                  </span>
                  <span>vs. mes anterior</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 truncate">
                  Ventas {formatCurrency(metrics.resumenMensual.gananciaVentas)} · OS{' '}
                  {formatCurrency(metrics.resumenMensual.gananciaOrdenes)}
                </p>
              </div>

              {/* Margen Neto % */}
              <div className="bg-card p-5 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-sm font-medium text-muted-foreground">Margen Neto %</p>
                  <span className="material-symbols-outlined text-muted-foreground text-[20px]">
                    percent
                  </span>
                </div>
                <h4 className="text-2xl font-bold text-foreground">
                  {metrics.resumenMensual.margenNetoPct.toFixed(1)}%
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Rentabilidad real sobre ingresos del mes
                </p>
              </div>

              {/* Operaciones del Mes */}
              <div className="bg-card p-5 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-sm font-medium text-muted-foreground">Operaciones del Mes</p>
                  <span className="material-symbols-outlined text-muted-foreground text-[20px]">
                    receipt_long
                  </span>
                </div>
                <h4 className="text-2xl font-bold text-foreground">
                  {metrics.resumenMensual.totalVentas +
                    metrics.resumenMensual.totalOrdenesEntregadas}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.resumenMensual.totalVentas} ventas ·{' '}
                  {metrics.resumenMensual.totalOrdenesEntregadas} órdenes entregadas
                </p>
              </div>
            </div>
          </section>

          {/* Rendimiento Mensual por Tienda */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Rendimiento Mensual por Tienda
                </h3>
                <p className="text-xs text-muted-foreground">
                  Comparativa de {selectedMesLabel} {anio} entre Tienda Copacabana, Cielo Plaza y Tienda Web.
                </p>
              </div>
              {localId !== 'all' && (
                <Button variant="ghost" size="sm" onClick={() => setLocalId('all')} className="h-7 text-xs">
                  Ver todos los locales
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {metrics.rendimientoPorLocal.map((tienda) => {
                const isWeb = tienda.codigo === 'WEB';
                const isSelected = localId === tienda.localId;

                return (
                  <div
                    key={tienda.localId}
                    className={cn(
                      'bg-card rounded-xl border p-5 shadow-sm transition-all flex flex-col gap-4',
                      isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-border'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                            isWeb
                              ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                              : 'bg-primary/10 text-primary'
                          )}
                        >
                          {isWeb ? <Globe className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm text-foreground truncate">
                            {tienda.nombre}
                          </h4>
                          <span className="text-[11px] text-muted-foreground">
                            {isWeb ? 'Canal Online' : 'Sede Física'}
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 px-2.5 text-xs shrink-0"
                        onClick={() => setLocalId(isSelected ? 'all' : tienda.localId)}
                      >
                        {isSelected ? 'Filtrado' : 'Filtrar'}
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60">
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground truncate">Ingresos</p>
                        <p className="text-sm sm:text-base font-bold text-foreground truncate">
                          {formatCurrency(tienda.ingresosTotales)}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-primary font-medium truncate">Ganancia Real</p>
                        <p className="text-sm sm:text-base font-bold text-green-600 dark:text-green-400 truncate">
                          {formatCurrency(tienda.gananciaTotal)}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground truncate">Margen %</p>
                        <p className="text-sm sm:text-base font-bold text-foreground truncate">
                          {tienda.margenPct.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60 text-xs">
                      <div className="rounded-lg bg-muted/40 p-2.5">
                        <p className="text-muted-foreground">Ventas</p>
                        <p className="font-bold text-sm text-foreground mt-0.5">
                          {tienda.cantidadVentas}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatCurrency(tienda.ingresosVentas)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-2.5">
                        <p className="text-muted-foreground">Órdenes Entregadas</p>
                        <p className="font-bold text-sm text-foreground mt-0.5">
                          {tienda.cantidadOrdenesEntregadas}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatCurrency(tienda.ingresosOrdenes)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Operación Diaria & Alertas */}
          <section className="space-y-3">
            <h3 className="text-base font-semibold text-foreground">Operación de Hoy y Alertas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Ventas de Hoy */}
              <Link
                to="/ventas"
                className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="flex justify-between items-start mb-4">
                  <p className="text-sm font-medium text-muted-foreground">Ventas de Hoy</p>
                  <span className="material-symbols-outlined text-muted-foreground text-[20px] group-hover:text-primary transition-colors">
                    payments
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-2xl font-bold text-foreground">{metrics.ventasHoy}</h4>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <span
                      className={cn(
                        'font-medium flex items-center mr-1',
                        getTrendClass(metrics.variacionVentasPct)
                      )}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {getTrendIcon(metrics.variacionVentasPct)}
                      </span>
                      {' '}{formatVariation(metrics.variacionVentasPct)}
                    </span>
                    {' '}vs. ayer · Ganancia {formatCurrency(metrics.gananciaHoy)}
                  </div>
                </div>
              </Link>

              {/* Card 2: Órdenes Activas */}
              <Link
                to="/ordenes-servicio"
                className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow block group"
              >
                <div className="flex justify-between items-start mb-4">
                  <p className="text-sm font-medium text-muted-foreground">Órdenes Activas</p>
                  <span className="material-symbols-outlined text-muted-foreground text-[20px] group-hover:text-primary transition-colors">
                    build_circle
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-2xl font-bold text-foreground">{metrics.ordenesActivas}</h4>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="text-blue-500 font-medium">
                      {metrics.ordenesDetalle.recibidas} recibidas
                    </span>
                    <span>·</span>
                    <span className="text-yellow-600 font-medium">
                      {metrics.ordenesDetalle.enReparacion} en proceso
                    </span>
                    <span>·</span>
                    <span className="text-green-600 font-medium">
                      {metrics.ordenesDetalle.listas} listas
                    </span>
                  </div>
                </div>
              </Link>

              {/* Card 3: Alertas Stock */}
              <Link
                to="/productos"
                className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="flex justify-between items-start mb-4">
                  <p className="text-sm font-medium text-muted-foreground">Alertas Stock</p>
                  <span className="material-symbols-outlined text-muted-foreground text-[20px] group-hover:text-primary transition-colors">
                    inventory
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-2xl font-bold text-foreground">
                    {metrics.productosStockBajo}
                  </h4>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <span className="text-destructive font-medium flex items-center mr-1">
                      <span className="material-symbols-outlined text-[14px]">warning</span>
                      {' '}Crítico
                    </span>
                    {' '}reponer pronto (stock compartido)
                  </div>
                </div>
              </Link>

              {/* Card 4: Productos Sin Movimiento */}
              <Link
                to="/productos"
                className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="flex justify-between items-start mb-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Productos Sin Movimiento
                  </p>
                  <span className="material-symbols-outlined text-muted-foreground text-[20px] group-hover:text-primary transition-colors">
                    history
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-2xl font-bold text-foreground">
                    {metrics.productosSinMovimiento}
                  </h4>
                  <div className="flex items-center text-xs text-muted-foreground">
                    Sin ventas en los últimos 90 días
                  </div>
                </div>
              </Link>
            </div>
          </section>
        </>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6 w-full">
        {/* Tabla Stock Crítico */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-card shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-lg">Stock Crítico</h3>
              <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-0.5 rounded-full border border-destructive/20">
                Bajo Stock
              </span>
            </div>
            <Link
              to="/productos"
              className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
            >
              Ver Productos{' '}
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    DETALLE
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                    CANT
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                    ACCIÓN
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground text-sm">
                      Todo en orden. No hay productos con stock bajo.
                    </td>
                  </tr>
                ) : (
                  currentItems.map((prod) => (
                    <tr key={prod.id} className="group hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center text-muted-foreground border border-border shrink-0">
                            <span className="material-symbols-outlined text-[20px]">
                              inventory_2
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-foreground">{prod.nombre}</p>
                            {prod.descripcion && (
                              <p className="text-xs text-muted-foreground truncate max-w-md">
                                {prod.descripcion}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center justify-center h-6 px-2.5 rounded-md text-xs font-bold border',
                            prod.stockActual === 0
                              ? 'bg-destructive/10 text-destructive border-destructive/20'
                              : 'bg-warning/10 text-warning-700 border-warning/20 text-orange-700'
                          )}
                        >
                          {prod.stockActual}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAjustarStock(prod)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <span className="material-symbols-outlined text-[16px] mr-1">add</span>
                          {' '}Stock
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {bajoStock.length > itemsPerPage && (
            <div className="px-6 py-4 border-t border-border bg-muted/20">
              <Pagination
                currentPage={currentPage}
                totalItems={bajoStock.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
          )}
        </div>

        {/* Lista Productos Estancados */}
        <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col h-full overflow-hidden min-w-0">
          <div className="px-4 sm:px-6 py-4 border-b border-border bg-card shrink-0">
            <div className="flex justify-between items-center mb-3 min-w-0 gap-2">
              <h3 className="font-semibold text-foreground text-lg flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-warning shrink-0">history</span>
                <span className="truncate">Productos Estancados</span>
              </h3>
              {loadingSinMovimiento && (
                <Loader2
                  aria-label="Actualizando productos estancados"
                  className="h-4 w-4 animate-spin text-muted-foreground shrink-0"
                />
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Sin movimiento hace:
              </span>
              <Select
                value={diasSinMovimiento.toString()}
                onValueChange={(value) => setDiasSinMovimiento(Number(value))}
              >
                <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 días</SelectItem>
                  <SelectItem value="60">60 días</SelectItem>
                  <SelectItem value="90">90 días</SelectItem>
                  <SelectItem value="120">120 días</SelectItem>
                  <SelectItem value="180">180 días</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 min-h-0 lg:relative lg:min-h-[360px]">
            <div className="max-h-[400px] lg:max-h-none lg:absolute lg:inset-0 overflow-y-auto p-4 custom-scrollbar">
              {sinMovimiento.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No hay productos estancados. ¡Buena rotación!
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {sinMovimiento.slice(0, 10).map((prod) => (
                    <div
                      key={prod.id}
                      className="flex items-start p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border cursor-pointer group"
                    >
                      <div className="h-10 w-10 rounded-md bg-muted flex-shrink-0 flex items-center justify-center text-muted-foreground border border-border group-hover:bg-background group-hover:border-border">
                        <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{prod.nombre}</p>
                          <span className="inline-block shrink-0 px-1.5 py-0.5 bg-warning/10 text-warning-700 text-[10px] font-bold rounded text-amber-700">
                            {prod.diasSinMovimiento}d
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          {prod.categoria && (
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                              {prod.categoria.nombre}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Stock: {prod.stockActual}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dialog para ajustar stock */}
      {productoSeleccionado && (
        <AjustarStockDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          producto={productoSeleccionado}
          onSuccess={handleStockSuccess}
        />
      )}
    </div>
  );
}
