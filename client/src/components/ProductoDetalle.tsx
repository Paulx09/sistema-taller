import { useState, useEffect } from 'react';
import { FEATURES } from '@/config/features';
import { productoService } from '@/services/producto.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { Input } from '@/components/ui/input';
import { Loader2, ChevronDown, TrendingUp, TrendingDown, Minus, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AjustarStockDialog } from './AjustarStockDialog';
import type { Producto, MovimientoStock, HistorialCosto } from '@/types';

interface ProductoDetalleProps {
  producto: Producto;
  onRefresh: () => void;
}

// Helper para determinar la variante del badge según el tipo de movimiento
const getBadgeVariant = (tipo: string) => {
  if (tipo === 'ENTRADA') return 'default';
  if (tipo === 'SALIDA') return 'destructive';
  return 'secondary';
};

// Helper para determinar el color del texto según el tipo de movimiento
const getTextColor = (tipo: string) => {
  if (tipo === 'ENTRADA' || tipo === 'INVENTARIO_INICIAL') return 'text-green-600';
  if (tipo === 'SALIDA') return 'text-red-600';
  return '';
};

// Helper para determinar el prefijo del signo
const getSignPrefix = (tipo: string) => {
  if (tipo === 'ENTRADA' || tipo === 'INVENTARIO_INICIAL') return '+';
  if (tipo === 'SALIDA') return '-';
  return '';
};

export function ProductoDetalle({ producto, onRefresh }: Readonly<ProductoDetalleProps>) {
  const [productoCompleto, setProductoCompleto] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(true);
  const [ajustarStockOpen, setAjustarStockOpen] = useState(false);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [recalcularPrecioOpen, setRecalcularPrecioOpen] = useState(false);
  const [precioSugerido, setPrecioSugerido] = useState(0);
  const [precioEditado, setPrecioEditado] = useState('');
  const [actualizandoPrecio, setActualizandoPrecio] = useState(false);

  // Calcular variación porcentual entre dos costos
  const calcularVariacion = (costoActual: number, costoAnterior: number | null) => {
    if (!costoAnterior || costoAnterior === 0) return null;
    const variacion = ((costoActual - costoAnterior) / costoAnterior) * 100;
    return variacion;
  };

  useEffect(() => {
    const fetchProducto = async () => {
      setLoading(true);
      try {
        const data = await productoService.getById(producto.id);
        setProductoCompleto(data);
      } catch (error) {
        console.error('Error al cargar producto:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducto();
  }, [producto.id]);

  const handleStockAjustado = () => {
    setAjustarStockOpen(false);
    onRefresh();
    // Recargar el producto completo
    productoService.getById(producto.id).then(setProductoCompleto);
  };

  const handleRecalcularPrecio = () => {
    if (!productoCompleto) return;

    // Usar COSTO DE REPOSICIÓN (última compra) en lugar de CPP
    const costoReposicion = productoCompleto.historialCostos && productoCompleto.historialCostos.length > 0
      ? Number.parseFloat(productoCompleto.historialCostos[0].costo) // Último costo registrado
      : productoCompleto.precioCompra; // Fallback al CPP si no hay historial

    const margen = productoCompleto.margenReferencia || 25; // Default 25%
    const sugerido = costoReposicion * (1 + margen / 100);
    
    setPrecioSugerido(sugerido);
    setPrecioEditado(sugerido.toFixed(2));
    setRecalcularPrecioOpen(true);
  };

  const handleAplicarNuevoPrecio = async () => {
    if (!productoCompleto) return;

    setActualizandoPrecio(true);
    try {
      await productoService.update(productoCompleto.id, {
        precioVenta: Number.parseFloat(precioEditado),
      });

      // Recargar producto y notificar
      const actualizado = await productoService.getById(productoCompleto.id);
      setProductoCompleto(actualizado);
      onRefresh();
      setRecalcularPrecioOpen(false);
    } catch (error) {
      console.error('Error al actualizar precio:', error);
    } finally {
      setActualizandoPrecio(false);
    }
  };

  if (loading || !productoCompleto) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="info">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="movimientos">
            Movimientos {productoCompleto.esServicio ? '(N/A)' : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          {/* Información General */}
          <Card>
            <CardHeader>
              <CardTitle>{productoCompleto.nombre}</CardTitle>
              <CardDescription>{productoCompleto.descripcion || 'Sin descripción'}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Categoría</p>
                <p>{productoCompleto.categoria?.nombre || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ubicación</p>
                <p>{productoCompleto.ubicacion?.nombre || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Marca</p>
                <p>{productoCompleto.marca || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Modelo</p>
                <p>{productoCompleto.modelo || '-'}</p>
              </div>
              {/* Feature: SKU - Controlado por config/features.ts */}
              {FEATURES.ENABLE_PRODUCT_SKU && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">SKU</p>
                  <p>{productoCompleto.sku || '-'}</p>
                </div>
              )}
              {/* Feature: Código de Barras - Controlado por config/features.ts */}
              {FEATURES.ENABLE_PRODUCT_BARCODE && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Código de Barras</p>
                  <p>{productoCompleto.codigoBarras || '-'}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Costo Promedio</p>
                <p className="font-semibold">S/. {productoCompleto.precioCompra.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Precio Venta</p>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-lg">S/. {productoCompleto.precioVenta.toFixed(2)}</p>
                  {productoCompleto.margenReferencia && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleRecalcularPrecio}
                      className="h-7 gap-1"
                    >
                      <Calculator className="h-3 w-3" />
                      Recalcular
                    </Button>
                  )}
                </div>
                
                {productoCompleto.precioCompra > 0 && (() => {
                  const cpp = productoCompleto.precioCompra;
                  const precioVenta = productoCompleto.precioVenta;
                  
                  // Utilidad Actual (sobre CPP - Promedio Ponderado)
                  const utilidadActual = cpp > 0 
                    ? (((precioVenta - cpp) / cpp) * 100) 
                    : 0;
                  
                  // Margen de Reposición (sobre última compra)
                  const costoReposicion = productoCompleto.historialCostos && productoCompleto.historialCostos.length > 0
                    ? Number.parseFloat(productoCompleto.historialCostos[0].costo)
                    : cpp;
                  
                  const margenReposicion = costoReposicion > 0
                    ? (((precioVenta - costoReposicion) / costoReposicion) * 100)
                    : 0;
                  
                  const margenObjetivo = productoCompleto.margenReferencia || null;
                  
                  return (
                    <div className="mt-2 space-y-1.5 text-xs">
                      {/* Utilidad Actual (Margen sobre CPP) */}
                      <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                        <span className="text-muted-foreground">💰 Utilidad Actual:</span>
                        <span className={cn(
                          "font-semibold",
                          utilidadActual >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {utilidadActual.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground pl-2">
                        Sobre inventario actual (CPP: S/. {cpp.toFixed(2)})
                      </p>
                      
                      {/* Margen de Reposición (Margen sobre última compra) */}
                      {costoReposicion !== cpp && (
                        <>
                          <div className="flex items-center justify-between p-2 rounded bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
                            <span className="text-muted-foreground">⚠️ Margen de Reposición:</span>
                            <span className={cn(
                              "font-semibold",
                              margenObjetivo && margenReposicion >= margenObjetivo 
                                ? "text-green-600" 
                                : "text-orange-600"
                            )}>
                              {margenReposicion.toFixed(1)}%
                              {margenObjetivo && margenReposicion >= margenObjetivo && " ✓"}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground pl-2">
                            Sobre última compra (S/. {costoReposicion.toFixed(2)})
                            {margenObjetivo && ` • Objetivo: ${margenObjetivo}%`}
                          </p>
                        </>
                      )}
                      
                      {/* Si solo hay un costo (inicial), mostrar info simplificada */}
                      {costoReposicion === cpp && margenObjetivo && (
                        <p className="text-[10px] text-muted-foreground pl-2">
                          Margen objetivo: {margenObjetivo}% 
                          <span className={cn(
                            "ml-1 font-semibold",
                            utilidadActual >= margenObjetivo ? "text-green-600" : "text-orange-600"
                          )}>
                            {utilidadActual >= margenObjetivo ? "✓ Cumplido" : "⚠️ Por debajo"}
                          </span>
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
              {!productoCompleto.esServicio && (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Stock Actual</p>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-lg">{productoCompleto.stockActual}</p>
                      <Button size="sm" onClick={() => setAjustarStockOpen(true)}>
                        Ajustar
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Stock Mínimo</p>
                    <p>{productoCompleto.stockMinimo}</p>
                  </div>
                </>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                <Badge variant={productoCompleto.esServicio ? 'secondary' : 'default'}>
                  {productoCompleto.esServicio ? 'Servicio' : 'Producto'}
                </Badge>
              </div>
              {productoCompleto.esSegundaMano && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estado</p>
                  <Badge variant="outline">Segunda Mano</Badge>
                </div>
              )}
              {productoCompleto.padre && (
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Producto Padre</p>
                  <p>{productoCompleto.padre.nombre}</p>
                </div>
              )}

              {/* Historial de Costos */}
              {productoCompleto.historialCostos && productoCompleto.historialCostos.length > 0 && (
                <div className="col-span-2 border-t pt-4 mt-2">
                  <Collapsible open={historialOpen} onOpenChange={setHistorialOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-muted-foreground">
                            Historial de Costos
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {productoCompleto.historialCostos.length} registros
                          </Badge>
                        </div>
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 transition-transform text-muted-foreground',
                            historialOpen && 'transform rotate-180'
                          )}
                        />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                      <div className="space-y-2">
                        {productoCompleto.historialCostos.map((historial: HistorialCosto, index: number) => {
                          const costoActual = Number.parseFloat(historial.costo);
                          const costoAnterior = index < productoCompleto.historialCostos!.length - 1
                            ? Number.parseFloat(productoCompleto.historialCostos![index + 1].costo)
                            : null;
                          const variacion = calcularVariacion(costoActual, costoAnterior);

                          return (
                            <div
                              key={historial.id}
                              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(historial.fechaRegistro).toLocaleDateString('es-ES', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  <span className="font-semibold">
                                    S/. {costoActual.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {variacion !== null && variacion !== 0 ? (
                                  <>
                                    {variacion > 0 ? (
                                      <TrendingUp className="h-4 w-4 text-red-500" />
                                    ) : (
                                      <TrendingDown className="h-4 w-4 text-green-500" />
                                    )}
                                    <span
                                      className={cn(
                                        'text-sm font-medium',
                                        variacion > 0 ? 'text-red-500' : 'text-green-500'
                                      )}
                                    >
                                      {variacion > 0 ? '+' : ''}
                                      {variacion.toFixed(1)}%
                                    </span>
                                  </>
                                ) : (
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Minus className="h-4 w-4" />
                                    <span className="text-xs">Inicial</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movimientos">
          {productoCompleto.esServicio ? (
            <div className="text-center text-muted-foreground p-8">
              Los servicios no tienen movimientos de stock
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!productoCompleto.movimientos || productoCompleto.movimientos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No hay movimientos de stock registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    [...productoCompleto.movimientos]
                      .sort(
                        (a, b) =>
                          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      )
                      .map((mov: MovimientoStock) => (
                        <TableRow key={mov.id}>
                          <TableCell>
                            {new Date(mov.createdAt).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getBadgeVariant(mov.tipo)}>
                              {mov.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right font-semibold',
                              getTextColor(mov.tipo)
                            )}
                          >
                            {getSignPrefix(mov.tipo)}
                            {mov.cantidad}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {mov.motivo || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog para ajustar stock */}
      <AjustarStockDialog
        open={ajustarStockOpen}
        onOpenChange={setAjustarStockOpen}
        producto={productoCompleto}
        onSuccess={handleStockAjustado}
      />

      {/* Dialog para recalcular precio con margen */}
      <AlertDialog open={recalcularPrecioOpen} onOpenChange={setRecalcularPrecioOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Recalcular Precio de Venta
            </AlertDialogTitle>
            <AlertDialogDescription>
              {productoCompleto && (() => {
                // Usar COSTO DE REPOSICIÓN (última compra) en lugar de CPP
                const costoReposicion = productoCompleto.historialCostos && productoCompleto.historialCostos.length > 0
                  ? Number.parseFloat(productoCompleto.historialCostos[0].costo)
                  : productoCompleto.precioCompra;
                
                const margenActual = costoReposicion > 0 
                  ? (((productoCompleto.precioVenta - costoReposicion) / costoReposicion) * 100)
                  : 0;

                const margenNuevo = Number.parseFloat(precioEditado || '0') > 0 && costoReposicion > 0
                  ? (((Number.parseFloat(precioEditado) - costoReposicion) / costoReposicion) * 100)
                  : 0;

                return (
                  <div className="space-y-3 pt-2">
                    <div className="text-sm text-foreground space-y-1">
                      <p>
                        <span className="font-medium">Costo de Reposición:</span> S/. {costoReposicion.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        (Última compra • CPP actual: S/. {productoCompleto.precioCompra.toFixed(2)})
                      </p>
                      <p>
                        <span className="font-medium">Margen Objetivo:</span> {productoCompleto.margenReferencia || 25}%
                      </p>
                      <p>
                        <span className="font-medium">Precio Actual:</span> S/. {productoCompleto.precioVenta.toFixed(2)}
                      </p>
                      <p className={cn(
                        "text-xs",
                        margenActual < (productoCompleto.margenReferencia || 25)
                          ? "text-orange-600 font-semibold"
                          : "text-muted-foreground"
                      )}>
                        Margen real: {margenActual.toFixed(1)}%
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        Nuevo Precio de Venta
                      </p>
                      <Input
                        type="text"
                        value={precioEditado}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^\d*\.?\d{0,2}$/.test(value)) {
                            setPrecioEditado(value);
                          }
                        }}
                        className="text-lg font-semibold"
                        placeholder="0.00"
                      />
                      {Number.parseFloat(precioEditado || '0') > 0 && (
                        <p className={cn(
                          "text-xs font-semibold",
                          margenNuevo >= (productoCompleto.margenReferencia || 25)
                            ? "text-green-600"
                            : "text-orange-600"
                        )}>
                          Margen resultante: {margenNuevo.toFixed(1)}%
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setPrecioEditado(precioSugerido.toFixed(2))}
                      >
                        Sugerido
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          const base = Number.parseFloat(precioEditado || precioSugerido.toString());
                          setPrecioEditado((Math.floor(base) + 0.99).toFixed(2));
                        }}
                      >
                        .99
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          const base = Number.parseFloat(precioEditado || precioSugerido.toString());
                          setPrecioEditado((Math.round(base / 10) * 10).toFixed(2));
                        }}
                      >
                        Redondear
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actualizandoPrecio}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleAplicarNuevoPrecio}
              disabled={actualizandoPrecio || !precioEditado || Number.parseFloat(precioEditado) <= 0}
            >
              {actualizandoPrecio ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Aplicando...
                </>
              ) : (
                'Aplicar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
