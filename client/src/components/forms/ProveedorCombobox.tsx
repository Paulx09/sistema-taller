import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, Loader2, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { crearProveedor } from '@/services/proveedor.service';
import type { Proveedor } from '@/types';

interface ProveedorComboboxProps {
  value: string;
  onChange: (value: string) => void;
  proveedores: Proveedor[];
  onProveedorCreado?: (proveedor: Proveedor) => void;
  disabled?: boolean;
}

export function ProveedorCombobox({
  value,
  onChange,
  proveedores,
  onProveedorCreado,
  disabled,
}: Readonly<ProveedorComboboxProps>) {
  const [open, setOpen] = useState(false);
  const [crearOpen, setCrearOpen] = useState(false);
  const [razonSocial, setRazonSocial] = useState('');
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  const [selectedLabel, setSelectedLabel] = useState<string>(
    () => proveedores.find((p) => p.id === value)?.nombreEmpresa || ''
  );

  useEffect(() => {
    if (value) {
      const found = proveedores.find((p) => p.id === value);
      if (found) setSelectedLabel(found.nombreEmpresa);
    } else {
      setSelectedLabel('');
    }
  }, [value, proveedores]);

  const handleCrear = async () => {
    const nombre = razonSocial.trim();
    if (!nombre) {
      setErrorCrear('La razón social es requerida');
      return;
    }
    setCreando(true);
    setErrorCrear(null);
    try {
      const result = await crearProveedor({ nombreEmpresa: nombre });
      const nuevo = result.data;
      setSelectedLabel(nuevo.nombreEmpresa);
      onChange(nuevo.id);
      onProveedorCreado?.(nuevo);
      setRazonSocial('');
      setCrearOpen(false);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string; error?: string } } };
      setErrorCrear(
        e.response?.data?.message || e.response?.data?.error || 'Error al crear proveedor'
      );
    } finally {
      setCreando(false);
    }
  };

  const handleOpenCrear = () => {
    setRazonSocial('');
    setErrorCrear(null);
    setCrearOpen(true);
  };

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="flex-1 justify-between font-normal h-9 px-3"
          >
            <span className={cn('truncate flex items-center gap-2', !selectedLabel && 'text-muted-foreground')}>
              {selectedLabel ? (
                <>
                  <Building2 className="h-4 w-4 shrink-0" />
                  {selectedLabel}
                </>
              ) : (
                'Seleccione proveedor'
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar proveedor..." />
            <CommandList>
              <CommandEmpty>Sin resultados.</CommandEmpty>
              <CommandGroup>
                {proveedores.map((prov) => (
                  <CommandItem
                    key={prov.id}
                    value={prov.nombreEmpresa}
                    onSelect={() => {
                      setSelectedLabel(prov.nombreEmpresa);
                      onChange(prov.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 shrink-0',
                        value === prov.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <Building2 className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    {prov.nombreEmpresa}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled}
        onClick={handleOpenCrear}
        title="Nuevo proveedor"
        className="shrink-0 h-9 w-9"
      >
        <Plus className="h-4 w-4" />
      </Button>

      <Dialog open={crearOpen} onOpenChange={setCrearOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuevo Proveedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="nuevo-proveedor-razon">Razón Social *</Label>
            <Input
              id="nuevo-proveedor-razon"
              value={razonSocial}
              onChange={(e) => {
                setRazonSocial(e.target.value);
                setErrorCrear(null);
              }}
              placeholder="Ej: Distribuidora Nueva SAC"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCrear();
              }}
              autoFocus
            />
            {errorCrear && <p className="text-xs text-destructive">{errorCrear}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCrearOpen(false)}
              disabled={creando}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCrear}
              disabled={creando || !razonSocial.trim()}
            >
              {creando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
