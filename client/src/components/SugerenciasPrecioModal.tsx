import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SugerenciaPrecio } from '@/types';

interface SugerenciasPrecioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sugerencias: SugerenciaPrecio[];
  onAplicar: (sugerenciasSeleccionadas: SugerenciaPrecio[]) => Promise<void>;
}

export function SugerenciasPrecioModal({
  open,
  onOpenChange,
  sugerencias: sugerenciasIniciales,
  onAplicar,
}: Readonly<SugerenciasPrecioModalProps>) {
  const [sugerencias, setSugerencias] = useState<SugerenciaPrecio[]>([]);
  const [loading, setLoading] = useState(false);

  // Inicializar sugerencias con valores editables
  useEffect(() => {
    if (sugerenciasIniciales.length > 0) {
      setSugerencias(
        sugerenciasIniciales.map(sug => ({
          ...sug,
          precioEditado: sug.precioSugerido,
          margenResultante: sug.margenReferencia || 0,
          aplicar: true, // Por defecto seleccionados
        }))
      );
    }
  }, [sugerenciasIniciales]);

  const handlePrecioChange = (index: number, valorInput: string) => {
    // Permitir edición libre, incluso con valores temporales vacíos o incompletos
    const precio = valorInput === '' ? 0 : Number.parseFloat(valorInput);
    
    setSugerencias(prev =>
      prev.map((sug, i) => {
        if (i === index) {
          const margen = sug.cppNuevo > 0 && precio > 0 ? ((precio - sug.cppNuevo) / sug.cppNuevo) * 100 : 0;
          return {
            ...sug,
            precioEditado: precio,
            margenResultante: margen,
          };
        }
        return sug;
      })
    );
  };

  const handleCheckboxChange = (index: number, checked: boolean) => {
    setSugerencias(prev =>
      prev.map((sug, i) => (i === index ? { ...sug, aplicar: checked } : sug))
    );
  };

  const handleAjusteRapido = (index: number, tipo: 'sugerido' | '+5' | '-5' | '.99' | '.90' | 'redondear') => {
    setSugerencias(prev =>
      prev.map((sug, i) => {
        if (i !== index) return sug;

        let nuevoPrecio = sug.precioEditado || sug.precioSugerido;

        switch (tipo) {
          case 'sugerido':
            nuevoPrecio = sug.precioSugerido;
            break;
          case '+5':
            nuevoPrecio = sug.precioSugerido * 1.05;
            break;
          case '-5':
            nuevoPrecio = sug.precioSugerido * 0.95;
            break;
          case '.99':
            nuevoPrecio = Math.floor(sug.precioEditado || sug.precioSugerido) + 0.99;
            break;
          case '.90':
            nuevoPrecio = Math.floor(sug.precioEditado || sug.precioSugerido) + 0.9;
            break;
          case 'redondear':
            nuevoPrecio = Math.round((sug.precioEditado || sug.precioSugerido) / 10) * 10;
            break;
        }

        const margen = sug.cppNuevo > 0 ? ((nuevoPrecio - sug.cppNuevo) / sug.cppNuevo) * 100 : 0;

        return {
          ...sug,
          precioEditado: nuevoPrecio,
          margenResultante: margen,
        };
      })
    );
  };

  const handleAplicar = async () => {
    const seleccionados = sugerencias.filter(s => s.aplicar);
    if (seleccionados.length === 0) return;

    setLoading(true);
    try {
      await onAplicar(seleccionados);
      onOpenChange(false);
    } catch (error) {
      console.error('Error al aplicar precios:', error);
    } finally {
      setLoading(false);
    }
  };

  const seleccionadosCount = sugerencias.filter(s => s.aplicar).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            Cambios de Costo Detectados
          </DialogTitle>
          <DialogDescription>
            Los siguientes productos han experimentado un aumento en su costo promedio ponderado.
            Ajusta los precios de venta para mantener tu margen de ganancia.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {sugerencias.map((sug, index) => {
            const margenActual = sug.precioActual > 0 
              ? ((sug.precioActual - sug.cppNuevo) / sug.cppNuevo) * 100 
              : 0;
            const margenResultante = sug.margenResultante || 0;
            const esCritico = margenActual < (sug.margenReferencia || 0) - 10;

            return (
              <div key={sug.productoId} className="border rounded-lg p-4 space-y-3">
                {/* Header con checkbox */}
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={sug.aplicar}
                    onCheckedChange={(checked: boolean) => handleCheckboxChange(index, checked)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-base">{sug.productoNombre}</h4>
                    
                    {/* Cambio de Precio Compra */}
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span>Precio Compra:</span>
                      <span className="font-mono">S/ {sug.cppAnterior.toFixed(2)}</span>
                      <span>→</span>
                      <span className="font-mono font-semibold text-orange-600">
                        S/ {sug.cppNuevo.toFixed(2)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        +{sug.variacionCPP.toFixed(1)}%
                      </Badge>
                      {sug.margenReferencia && (
                        <Badge variant="secondary" className="text-xs">
                          Margen ref: {sug.margenReferencia}%
                        </Badge>
                      )}
                    </div>

                    {/* Precio actual vs nuevo */}
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Precio Actual</p>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold">S/ {sug.precioActual.toFixed(2)}</span>
                          {esCritico && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <p className={cn(
                          "text-xs mt-0.5",
                          esCritico ? "text-red-600 font-semibold" : "text-muted-foreground"
                        )}>
                          Margen: {margenActual.toFixed(1)}%
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Nuevo Precio</p>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={sug.precioEditado || 0}
                          onChange={(e) => handlePrecioChange(index, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="h-8 font-mono"
                        />
                        <p className={cn(
                          "text-xs mt-0.5 font-semibold",
                          margenResultante >= (sug.margenReferencia || 0) ? "text-green-600" : "text-orange-600"
                        )}>
                          Margen: {margenResultante.toFixed(1)}%
                          {margenResultante >= (sug.margenReferencia || 0) && (
                            <CheckCircle2 className="inline h-3 w-3 ml-1" />
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Ajustes rápidos</p>
                        <div className="flex flex-wrap gap-1">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-6 text-xs px-2"
                            onClick={() => handleAjusteRapido(index, 'sugerido')}
                          >
                            Sugerido
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-6 text-xs px-2"
                            onClick={() => handleAjusteRapido(index, '.99')}
                          >
                            .99
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-6 text-xs px-2"
                            onClick={() => handleAjusteRapido(index, 'redondear')}
                          >
                            Redondear
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAplicar} disabled={seleccionadosCount === 0 || loading}>
            {loading ? 'Aplicando...' : `Aplicar Seleccionados (${seleccionadosCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
