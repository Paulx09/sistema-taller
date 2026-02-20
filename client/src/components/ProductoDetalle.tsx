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
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AjustarStockDialog } from './AjustarStockDialog';
import type { Producto, MovimientoStock } from '@/types';

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
                <p className="text-sm font-medium text-muted-foreground">Precio Compra</p>
                <p className="font-semibold">S/. {productoCompleto.precioCompra.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Precio Venta</p>
                <p className="font-semibold">S/. {productoCompleto.precioVenta.toFixed(2)}</p>
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
    </div>
  );
}
