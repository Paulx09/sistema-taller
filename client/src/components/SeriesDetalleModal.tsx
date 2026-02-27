import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { Loader2, Package, Search, AlertCircle } from 'lucide-react';
import { serieService } from '@/services/serie.service';
import type { ProductoSerie, EstadoSerie, SerieEstadisticas } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  productoId: string;
  productoNombre: string;
}

const estadoColors: Record<EstadoSerie, string> = {
  DISPONIBLE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  VENDIDO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  GARANTIA: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  DEVUELTO: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export const SeriesDetalleModal = ({
  isOpen,
  onClose,
  productoId,
  productoNombre,
}: Props) => {
  const [series, setSeries] = useState<ProductoSerie[]>([]);
  const [seriesFiltradas, setSeriesFiltradas] = useState<ProductoSerie[]>([]);
  const [estadisticas, setEstadisticas] = useState<SerieEstadisticas | null>(null);
  const [loading, setLoading] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<EstadoSerie | 'TODOS'>('TODOS');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    if (isOpen) {
      cargarDatos();
    }
  }, [isOpen, productoId]);

  useEffect(() => {
    // Filtrar series por estado y búsqueda
    let resultado = series;

    if (filtroEstado !== 'TODOS') {
      resultado = resultado.filter((s) => s.estado === filtroEstado);
    }

    if (busqueda) {
      const termino = busqueda.toLowerCase();
      resultado = resultado.filter((s) =>
        s.numeroSerie.toLowerCase().includes(termino)
      );
    }

    setSeriesFiltradas(resultado);
  }, [series, filtroEstado, busqueda]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [seriesData, stats] = await Promise.all([
        serieService.obtenerSeriesPorProducto(productoId),
        serieService.obtenerEstadisticas(productoId),
      ]);
      setSeries(seriesData);
      setEstadisticas(stats);
    } catch (error) {
      console.error('Error al cargar series:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalSeries = series.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Números de Serie Registrados</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {productoNombre}
              </p>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Estadísticas */}
            {estadisticas && (
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-900">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {estadisticas.DISPONIBLE}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-500 uppercase font-medium mt-1">
                    Disponible
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    {estadisticas.VENDIDO}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-500 uppercase font-medium mt-1">
                    Vendido
                  </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900">
                  <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                    {estadisticas.GARANTIA}
                  </div>
                  <div className="text-xs text-yellow-600 dark:text-yellow-500 uppercase font-medium mt-1">
                    Garantía
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-900">
                  <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                    {estadisticas.DEVUELTO}
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-500 uppercase font-medium mt-1">
                    Devuelto
                  </div>
                </div>
              </div>
            )}

            {/* Filtros */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número de serie..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={filtroEstado}
                onValueChange={(value) => setFiltroEstado(value as EstadoSerie | 'TODOS')}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos ({totalSeries})</SelectItem>
                  <SelectItem value="DISPONIBLE">
                    Disponible ({estadisticas?.DISPONIBLE || 0})
                  </SelectItem>
                  <SelectItem value="VENDIDO">
                    Vendido ({estadisticas?.VENDIDO || 0})
                  </SelectItem>
                  <SelectItem value="GARANTIA">
                    Garantía ({estadisticas?.GARANTIA || 0})
                  </SelectItem>
                  <SelectItem value="DEVUELTO">
                    Devuelto ({estadisticas?.DEVUELTO || 0})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tabla de series */}
            <div className="flex-1 overflow-auto border rounded-lg">
              {seriesFiltradas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mb-3" />
                  <p className="text-sm">
                    {busqueda || filtroEstado !== 'TODOS'
                      ? 'No se encontraron resultados'
                      : 'No hay números de serie registrados'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número de Serie</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Fecha Registro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {seriesFiltradas.map((serie) => (
                      <TableRow key={serie.id}>
                        <TableCell className="font-mono font-medium">
                          {serie.numeroSerie}
                        </TableCell>
                        <TableCell>
                          <Badge className={estadoColors[serie.estado]}>
                            {serie.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {serie.compra ? (
                            <div>
                              <div className="font-medium">
                                {serie.compra.proveedor?.nombreEmpresa || 'Compra'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(serie.compra.fechaCompra).toLocaleDateString('es-PE')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {serie.venta ? (
                            <div>
                              <div className="font-medium">
                                {serie.venta.clienteNombre || 'Cliente genérico'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(serie.venta.fecha).toLocaleDateString('es-PE')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(serie.createdAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="flex justify-between items-center text-sm text-muted-foreground border-t pt-4">
              <span>
                Mostrando {seriesFiltradas.length} de {totalSeries} registros
              </span>
              <Button onClick={onClose}>Cerrar</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
