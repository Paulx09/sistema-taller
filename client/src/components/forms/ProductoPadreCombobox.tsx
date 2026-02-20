import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
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
import { productoService } from '@/services/producto.service';

interface ProductoPadreComboboxProps {
  value?: string;
  onChange: (value: string) => void;
  excludeId?: string;
}

export function ProductoPadreCombobox({
  value,
  onChange,
  excludeId,
}: Readonly<ProductoPadreComboboxProps>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [productos, setProductos] = useState<
    Array<{ id: string; nombre: string; marca: string | null; stockActual: number }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');

  // Buscar productos cuando cambia el search
  useEffect(() => {
    const fetchProductos = async () => {
      if (search.length < 2) {
        setProductos([]);
        return;
      }

      setLoading(true);
      try {
        const results = await productoService.buscarParaCombobox(search, excludeId);
        setProductos(results);
      } catch (error) {
        console.error('Error al buscar productos:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchProductos, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [search, excludeId]);

  // Obtener el producto seleccionado al cargar
  useEffect(() => {
    if (value && !selectedLabel) {
      productoService.getById(value).then((producto) => {
        setSelectedLabel(producto.nombre);
      });
    }
  }, [value, selectedLabel]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedLabel || 'Seleccione un producto padre...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar producto..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                'No se encontraron productos'
              )}
            </CommandEmpty>
            {productos.length > 0 && (
              <CommandGroup>
                {productos.map((producto) => (
                  <CommandItem
                    key={producto.id}
                    value={producto.id}
                    onSelect={() => {
                      onChange(producto.id);
                      setSelectedLabel(producto.nombre);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === producto.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{producto.nombre}</span>
                      {producto.marca && (
                        <span className="text-xs text-muted-foreground">
                          {producto.marca} | Stock: {producto.stockActual}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
