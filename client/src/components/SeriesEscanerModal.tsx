import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, AlertCircle, Barcode, X } from 'lucide-react';
import { serieService } from '@/services/serie.service';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  productoNombre: string;
  cantidad: number;
  onSeriesCompletas: (series: string[]) => void;
  modo?: 'compra' | 'venta'; // Compra: registrar nuevas | Venta: seleccionar existentes
  productoId?: string; // Solo para modo venta
}

export const SeriesEscanerModal = ({
  isOpen,
  onClose,
  productoNombre,
  cantidad,
  onSeriesCompletas,
  modo = 'compra',
  productoId,
}: Props) => {
  const [series, setSeries] = useState<string[]>([]);
  const [serieActual, setSerieActual] = useState('');
  const [validando, setValidando] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus en el input cuando se abre el modal o se agrega una serie
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, series.length]);

  // Limpiar estado al cerrar
  useEffect(() => {
    if (!isOpen) {
      setSeries([]);
      setSerieActual('');
      setError('');
    }
  }, [isOpen]);

  const agregarSerie = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const serieTrimmed = serieActual.trim().toUpperCase();
    if (!serieTrimmed) return;

    // Validar duplicado local
    if (series.includes(serieTrimmed)) {
      setError('Este número de serie ya fue escaneado en esta sesión');
      setSerieActual('');
      return;
    }

    setValidando(true);
    setError('');

    try {
      if (modo === 'compra') {
        // En modo compra: verificar que NO exista en la BD
        const disponible = await serieService.verificarDisponibilidad(serieTrimmed);
        if (!disponible) {
          setError(`El número de serie ${serieTrimmed} ya existe en el sistema`);
          setValidando(false);
          setSerieActual('');
          return;
        }
      } else if (modo === 'venta' && productoId) {
        // En modo venta: verificar que exista Y esté disponible
        const serie = await serieService.buscarPorNumeroSerie(serieTrimmed);
        if (!serie) {
          setError(`El número de serie ${serieTrimmed} no existe`);
          setValidando(false);
          setSerieActual('');
          return;
        }
        if (serie.productoId !== productoId) {
          setError(`El número de serie ${serieTrimmed} pertenece a otro producto`);
          setValidando(false);
          setSerieActual('');
          return;
        }
        if (serie.estado !== 'DISPONIBLE') {
          setError(`El número de serie ${serieTrimmed} no está disponible (Estado: ${serie.estado})`);
          setValidando(false);
          setSerieActual('');
          return;
        }
      }

      // Agregar serie a la lista
      const nuevasSeries = [...series, serieTrimmed];
      setSeries(nuevasSeries);
      setSerieActual('');

      // Si completamos todas las series, llamar al callback automáticamente
      if (nuevasSeries.length === cantidad) {
        setTimeout(() => {
          onSeriesCompletas(nuevasSeries);
          onClose();
        }, 500);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al validar el número de serie');
    } finally {
      setValidando(false);
    }
  };

  const eliminarSerie = (index: number) => {
    setSeries((prev) => prev.filter((_, i) => i !== index));
    setError('');
  };

  const handleFinalizar = () => {
    if (series.length === cantidad) {
      onSeriesCompletas(series);
      onClose();
    }
  };

  const handleCancelar = () => {
    setSeries([]);
    setSerieActual('');
    setError('');
    onClose();
  };

  const indiceActual = series.length;
  const progreso = Math.round((series.length / cantidad) * 100);

  return (
    <Dialog open={isOpen} onOpenChange={handleCancelar}>
      <DialogContent className="max-w-[540px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Barcode className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Escanear Números de Serie</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {modo === 'compra' ? 'Registre' : 'Seleccione'} los números de serie para <strong>{productoNombre}</strong>
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Barra de progreso */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Progreso: <strong className="text-foreground">{series.length}</strong> de <strong className="text-foreground">{cantidad}</strong>
            </span>
            <span className="text-primary font-medium">{progreso}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>

        {/* Lista de series */}
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
          {/* Series completadas */}
          {series.map((serie, idx) => (
            <div key={idx} className="group flex items-center gap-3 bg-muted/50 rounded-lg p-3 border border-border">
              <span className="text-xs font-semibold text-muted-foreground w-20 shrink-0">
                UNIDAD {idx + 1}
              </span>
              <Input
                value={serie}
                readOnly
                className="flex-1 bg-background font-mono text-sm"
              />
              <Badge variant="default" className="bg-green-600 hover:bg-green-700 gap-1 shrink-0">
                <CheckCircle2 className="h-3 w-3" />
                ESCANEADO
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => eliminarSerie(idx)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {/* Input activo */}
          {indiceActual < cantidad && (
            <form onSubmit={agregarSerie} className="space-y-2">
              <div className="flex items-center gap-3 bg-primary/5 rounded-lg p-3 border-2 border-primary/20">
                <span className="text-xs font-bold text-primary w-20 shrink-0 uppercase">
                  Unidad {indiceActual + 1}
                </span>
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={serieActual}
                    onChange={(e) => setSerieActual(e.target.value)}
                    placeholder="Escanee o escriba el serial..."
                    disabled={validando}
                    className="pr-10 font-mono uppercase"
                    autoComplete="off"
                  />
                  {validando && (
                    <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-3 text-muted-foreground" />
                  )}
                </div>
                <Badge variant="outline" className="gap-1 shrink-0 animate-pulse">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  ESPERANDO
                </Badge>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </form>
          )}

          {/* Series pendientes */}
          {Array.from({ length: cantidad - indiceActual - 1 }).map((_, idx) => (
            <div
              key={`pending-${idx}`}
              className="flex items-center gap-3 opacity-40 rounded-lg p-3 border border-dashed border-border"
            >
              <span className="text-xs text-muted-foreground w-20 shrink-0">
                Unidad {indiceActual + idx + 2}
              </span>
              <Input
                placeholder="Pendiente..."
                disabled
                className="flex-1 bg-muted/30"
              />
              <Badge variant="secondary" className="shrink-0">
                PENDIENTE
              </Badge>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelar}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleFinalizar}
            disabled={series.length !== cantidad}
            className="flex-[2] gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Finalizar Carga ({series.length}/{cantidad})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
