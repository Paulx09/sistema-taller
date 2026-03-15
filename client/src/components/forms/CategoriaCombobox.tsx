import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react';
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
import { categoriaService } from '@/services/categoria.service';

interface CategoriaItem {
  id: string;
  nombre: string;
}

interface CategoriaComboboxProps {
  value: string;
  onChange: (value: string) => void;
  categorias: CategoriaItem[];
  onCategoriaCreada?: (categoria: CategoriaItem) => void;
  disabled?: boolean;
}

export function CategoriaCombobox({
  value,
  onChange,
  categorias,
  onCategoriaCreada,
  disabled,
}: Readonly<CategoriaComboboxProps>) {
  const [open, setOpen] = useState(false);
  const [crearOpen, setCrearOpen] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  // Label local para mostrar la categoría seleccionada aunque la lista del padre no haya actualizado aún
  const [selectedLabel, setSelectedLabel] = useState<string>(
    () => categorias.find((c) => c.id === value)?.nombre || ''
  );

  useEffect(() => {
    if (value) {
      const found = categorias.find((c) => c.id === value);
      if (found) setSelectedLabel(found.nombre);
    } else {
      setSelectedLabel('');
    }
  }, [value, categorias]);

  const handleCrear = async () => {
    const nombre = nuevoNombre.trim();
    if (!nombre) {
      setErrorCrear('El nombre es requerido');
      return;
    }
    setCreando(true);
    setErrorCrear(null);
    try {
      const nueva = await categoriaService.create({ nombre });
      setSelectedLabel(nueva.nombre);
      onChange(nueva.id);
      onCategoriaCreada?.(nueva);
      setNuevoNombre('');
      setCrearOpen(false);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string; error?: string } } };
      setErrorCrear(
        e.response?.data?.message || e.response?.data?.error || 'Error al crear categoría'
      );
    } finally {
      setCreando(false);
    }
  };

  const handleOpenCrear = () => {
    setNuevoNombre('');
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
            className="flex-1 justify-between bg-background border-border font-normal h-9 px-3"
          >
            <span className={cn('truncate', !selectedLabel && 'text-muted-foreground')}>
              {selectedLabel || 'Seleccionar...'}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar categoría..." />
            <CommandList>
              <CommandEmpty>Sin resultados.</CommandEmpty>
              <CommandGroup>
                {categorias.map((cat) => (
                  <CommandItem
                    key={cat.id}
                    value={cat.nombre}
                    onSelect={() => {
                      setSelectedLabel(cat.nombre);
                      onChange(cat.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 shrink-0',
                        value === cat.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {cat.nombre}
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
        title="Nueva categoría"
        className="shrink-0 h-9 w-9"
      >
        <Plus className="h-4 w-4" />
      </Button>

      <Dialog open={crearOpen} onOpenChange={setCrearOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva Categoría</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="nueva-categoria-nombre">Nombre *</Label>
            <Input
              id="nueva-categoria-nombre"
              value={nuevoNombre}
              onChange={(e) => {
                setNuevoNombre(e.target.value);
                setErrorCrear(null);
              }}
              placeholder="Ej: Laptops, Accesorios..."
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
              disabled={creando || !nuevoNombre.trim()}
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
