import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Search, Calendar, Package, User, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { verificarGarantia } from '@/services/serie.service';
import type { VerificarGarantiaResponse } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function VerificarGarantiaPage() {
  const [numeroSerie, setNumeroSerie] = useState('');
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<VerificarGarantiaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus al cargar y después de cada búsqueda
  useEffect(() => {
    if (!cargando && !resultado) {
      inputRef.current?.focus();
    }
  }, [cargando, resultado]);

  const handleBuscar = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!numeroSerie.trim()) return;

    setCargando(true);
    setError(null);
    setResultado(null);

    try {
      const data = await verificarGarantia(numeroSerie.trim());
      setResultado(data);
    } catch (err) {
      const errorObj = err as { response?: { data?: { error?: string } }; message?: string };
      setError(errorObj.response?.data?.error || errorObj.message || 'Error al verificar garantía');
    } finally {
      setCargando(false);
    }
  };

  const handleNuevaBusqueda = () => {
    setNumeroSerie('');
    setResultado(null);
    setError(null);
    inputRef.current?.focus();
  };

  const renderGarantiaStatus = (
    tipo: 'cliente' | 'proveedor',
    vigente: boolean,
    diasRestantes: number | null,
    fechaVencimiento: string | null
  ) => {
    const esCliente = tipo === 'cliente';
    const titulo = esCliente ? 'Garantía Cliente' : 'Garantía Proveedor';
    const icono = esCliente ? User : Building2;
    const Icon = icono;

    if (vigente && diasRestantes !== null && fechaVencimiento) {
      const color = diasRestantes <= 30 ? 'text-yellow-600' : 'text-green-600';
      const bgColor = diasRestantes <= 30 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200';
      const badgeColor = diasRestantes <= 30 ? 'bg-yellow-100 text-yellow-800 ring-yellow-600/20' : 'bg-green-100 text-green-800 ring-green-600/20';

      return (
        <Card className={cn('border-2', bgColor)}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={cn('h-5 w-5', color)} />
                <CardTitle className="text-lg">{titulo}</CardTitle>
              </div>
              <Badge className={badgeColor}>Vigente</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className={cn('h-5 w-5', color)} />
              <span className={cn('font-semibold text-lg', color)}>
                {diasRestantes} {diasRestantes === 1 ? 'día' : 'días'} restantes
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Vence: {format(new Date(fechaVencimiento), "d 'de' MMMM 'de' yyyy", { locale: es })}</span>
            </div>
            {diasRestantes <= 30 && (
              <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-100 p-2 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span>La garantía está próxima a vencer</span>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    if (!vigente && fechaVencimiento) {
      return (
        <Card className="border-2 bg-red-50 border-red-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-red-600" />
                <CardTitle className="text-lg">{titulo}</CardTitle>
              </div>
              <Badge className="bg-red-100 text-red-800 ring-red-600/20">Vencida</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="font-semibold text-lg text-red-600">Garantía expirada</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Venció: {format(new Date(fechaVencimiento), "d 'de' MMMM 'de' yyyy", { locale: es })}</span>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-2 bg-gray-50 border-gray-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-gray-500" />
            <CardTitle className="text-lg">{titulo}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-gray-600">
            <AlertCircle className="h-5 w-5" />
            <span>No tiene garantía establecida</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Verificar Garantía</h1>
        <p className="text-muted-foreground">
          Escanea o ingresa el número de serie para consultar el estado de la garantía
        </p>
      </div>

      {/* Buscador */}
      {!resultado && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Buscar Número de Serie</CardTitle>
            <CardDescription>
              Utiliza el lector de código de barras o ingresa manualmente el número
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBuscar} className="flex gap-2">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Número de serie (ej: SN123456789)"
                value={numeroSerie}
                onChange={(e) => setNumeroSerie(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleBuscar();
                  }
                }}
                disabled={cargando}
                className="flex-1 text-lg"
              />
              <Button type="submit" disabled={cargando || !numeroSerie.trim()}>
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="mb-6 border-2 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <XCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">Error al verificar</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
            <Button onClick={handleNuevaBusqueda} variant="outline" className="mt-4">
              Intentar de nuevo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="space-y-6">
          {/* Información del Producto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Información del Producto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Número de Serie</p>
                <p className="text-lg font-mono font-semibold">{resultado.numeroSerie}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Producto</p>
                <p className="text-lg font-semibold">{resultado.producto?.nombre}</p>
                {resultado.producto?.marca && (
                  <p className="text-sm text-muted-foreground">
                    {resultado.producto.marca}
                    {resultado.producto.modelo && ` - ${resultado.producto.modelo}`}
                  </p>
                )}
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge
                    className={cn(
                      resultado.estado === 'DISPONIBLE' && 'bg-green-100 text-green-800 ring-green-600/20',
                      resultado.estado === 'VENDIDO' && 'bg-blue-100 text-blue-800 ring-blue-600/20',
                      resultado.estado === 'GARANTIA' && 'bg-yellow-100 text-yellow-800 ring-yellow-600/20',
                      resultado.estado === 'DEVUELTO' && 'bg-red-100 text-red-800 ring-red-600/20'
                    )}
                  >
                    {resultado.estado}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estados de Garantía */}
          <div className="grid md:grid-cols-2 gap-4">
            {resultado.garantiaCliente && renderGarantiaStatus(
              'cliente',
              resultado.garantiaCliente.vigente,
              resultado.garantiaCliente.diasRestantes,
              resultado.garantiaCliente.fechaVencimiento
            )}
            {resultado.garantiaProveedor && renderGarantiaStatus(
              'proveedor',
              resultado.garantiaProveedor.vigente,
              resultado.garantiaProveedor.diasRestantes,
              resultado.garantiaProveedor.fechaVencimiento
            )}
          </div>

          {/* Botón para nueva búsqueda */}
          <div className="flex justify-center pt-4">
            <Button onClick={handleNuevaBusqueda} size="lg">
              <Search className="h-4 w-4 mr-2" />
              Verificar otro número de serie
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
