import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, AlertCircle } from 'lucide-react';
import { serieService } from '@/services/serie.service';
import type { ProductoSerie } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  productoId: string;
  productoNombre: string;
  cantidadRequerida: number;
  onSeriesSeleccionadas: (series: string[]) => void;
}

export const SeriesSeleccionModal = ({
  isOpen,
  onClose,
  productoId,
  productoNombre,
  cantidadRequerida,
  onSeriesSeleccionadas,
}: Props) => {
  const [seriesDisponibles, setSeriesDisponibles] = useState<ProductoSerie[]>([]);
  const [seriesSeleccionadas, setSeriesSeleccionadas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    if (isOpen) {
      cargarSeriesDisponibles();
      setSeriesSeleccionadas([]);
      setBusqueda('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, productoId]);

  const cargarSeriesDisponibles = async () => {
    setLoading(true);
    try {
      const series = await serieService.obtenerSeriesPorProducto(productoId);
      // Filtrar solo las series DISPONIBLES
      const disponibles = series.filter((s) => s.estado === 'DISPONIBLE');
      setSeriesDisponibles(disponibles);
    } catch (error) {
      console.error('Error al cargar series:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSerie = (numeroSerie: string) => {
    if (seriesSeleccionadas.includes(numeroSerie)) {
      setSeriesSeleccionadas(seriesSeleccionadas.filter((s) => s !== numeroSerie));
    } else if (seriesSeleccionadas.length < cantidadRequerida) {
      // Limitar a la cantidad requerida
      setSeriesSeleccionadas([...seriesSeleccionadas, numeroSerie]);
    }
  };

  const handleConfirmar = () => {
    if (seriesSeleccionadas.length === cantidadRequerida) {
      onSeriesSeleccionadas(seriesSeleccionadas);
      onClose();
    }
  };

  const seriesFiltradas = seriesDisponibles.filter((serie) =>
    serie.numeroSerie.toLowerCase().includes(busqueda.toLowerCase())
  );

  const puedeContinuar = seriesSeleccionadas.length === cantidadRequerida;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Seleccionar Series para Salida</DialogTitle>
          <DialogDescription>
            Producto: {productoNombre} | Debe seleccionar {cantidadRequerida} serie(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Indicador de progreso */}
          <Alert variant={puedeContinuar ? 'default' : 'destructive'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {puedeContinuar ? (
                <span className="text-green-600 font-semibold">
                  ✓ Has seleccionado las {cantidadRequerida} series necesarias
                </span>
              ) : (
                <span>
                  Seleccionadas: {seriesSeleccionadas.length} / {cantidadRequerida}
                </span>
              )}
            </AlertDescription>
          </Alert>

          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por número de serie..."
              className="pl-9"
            />
          </div>

          {/* Lista de series */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : seriesDisponibles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No hay series disponibles para este producto</p>
            </div>
          ) : (
            <div className="border rounded-lg max-h-96 overflow-y-auto">
              <div className="divide-y">
                {seriesFiltradas.map((serie) => {
                  const isSelected = seriesSeleccionadas.includes(serie.numeroSerie);
                  const isDisabled =
                    !isSelected && seriesSeleccionadas.length >= cantidadRequerida;

                  return (
                    <button
                      key={serie.id}
                      onClick={() => !isDisabled && toggleSerie(serie.numeroSerie)}
                      disabled={isDisabled}
                      className={`w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center gap-3 ${
                        isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      } ${isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isDisabled}
                        readOnly
                        className="h-4 w-4 rounded pointer-events-none"
                      />
                      <div className="flex-1">
                        <div className="font-mono font-semibold text-sm">
                          {serie.numeroSerie}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Registrada: {new Date(serie.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {seriesFiltradas.length === 0 && !loading && busqueda && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No se encontraron series que coincidan con "{busqueda}"
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} disabled={!puedeContinuar}>
            Confirmar Selección
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
