import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, User, Phone, FileText, Loader2 } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { clienteService } from '@/services/cliente.service';
import type { Cliente } from '@/types';

interface ClienteComboboxProps {
  value?: string; // clienteId
  clienteSeleccionado?: Cliente | null;
  onChange: (id: string, nombre: string, cliente?: Cliente | null) => void;
  disabled?: boolean;
  clientes?: Cliente[];
  onClienteCreado?: (cliente: Cliente) => void;
  onRefresh?: () => void;
  className?: string;
}

export function ClienteCombobox({
  value,
  clienteSeleccionado,
  onChange,
  disabled = false,
  clientes: clientesProp,
  onClienteCreado,
  onRefresh,
  className,
}: ClienteComboboxProps) {
  const [open, setOpen] = useState(false);
  const [crearOpen, setCrearOpen] = useState(false);
  const [clientesLocales, setClientesLocales] = useState<Cliente[]>(clientesProp || []);

  // Formulario rápido de creación
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoDniRuc, setNuevoDniRuc] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  // Sincronizar clientes
  useEffect(() => {
    if (clientesProp) {
      setClientesLocales(clientesProp);
    } else {
      cargarClientes();
    }
  }, [clientesProp]);

  const cargarClientes = async () => {
    try {
      const res = await clienteService.getAll({ limit: 100 });
      setClientesLocales(res.clientes || []);
    } catch {
      setClientesLocales([]);
    }
  };

  const clienteActual =
    clienteSeleccionado ??
    clientesLocales.find((c) => c.id === value);

  const handleCrearCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoCliente(true);
    setErrorCrear(null);
    try {
      const nombreFinal = nuevoNombre.trim() || 'Cliente sin nombre';
      const nuevo = await clienteService.create({
        nombre: nombreFinal,
        dniRuc: nuevoDniRuc.trim() || undefined,
        telefono: nuevoTelefono.trim() || undefined,
      });

      setClientesLocales((prev) => [nuevo, ...prev]);
      onClienteCreado?.(nuevo);
      onRefresh?.();
      onChange(nuevo.id, nuevo.nombre, nuevo);

      setCrearOpen(false);
      setNuevoNombre('');
      setNuevoDniRuc('');
      setNuevoTelefono('');
    } catch (err: any) {
      setErrorCrear(
        err?.response?.data?.error || err?.response?.data?.message || 'Error al registrar cliente'
      );
    } finally {
      setGuardandoCliente(false);
    }
  };

  return (
    <div className={cn('flex items-center gap-1.5 w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="flex-1 justify-between text-left font-normal h-9 truncate"
          >
            {clienteActual ? (
              <span className="truncate flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-medium text-foreground truncate">{clienteActual.nombre}</span>
                {clienteActual.telefono && (
                  <span className="text-xs text-muted-foreground truncate">
                    ({clienteActual.telefono})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground truncate flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                Cliente sin nombre (General)
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[320px] p-0" align="start">
          <Command
            filter={(value, search) => {
              if (!search) return 1;
              return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
            }}
          >
            <CommandInput placeholder="Buscar por nombre, DNI o tel..." />
            <CommandList className="max-h-44">
              <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                No se encontraron clientes.
              </CommandEmpty>

              <CommandGroup>
                {/* Opción para limpiar selección / Cliente sin nombre */}
                <CommandItem
                  value="sin cliente general anonimo venta rapida mostrador"
                  onSelect={() => {
                    onChange('', '');
                    setOpen(false);
                  }}
                  className="italic text-muted-foreground flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Cliente sin nombre (General)</span>
                  </div>
                  {!value && <Check className="h-4 w-4 text-primary" />}
                </CommandItem>

                {clientesLocales.map((c) => {
                  const isSelected = value === c.id;
                  const searchStr = `${c.nombre} ${c.dniRuc ?? ''} ${c.telefono ?? ''}`;
                  return (
                    <CommandItem
                      key={c.id}
                      value={searchStr}
                      onSelect={() => {
                        onChange(c.id, c.nombre, c);
                        setOpen(false);
                      }}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="font-medium truncate text-sm">{c.nombre}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate">
                          {c.dniRuc && <span>DNI/RUC: {c.dniRuc}</span>}
                          {c.telefono && <span>Tel: {c.telefono}</span>}
                        </div>
                      </div>
                      <Check
                        className={cn(
                          'h-4 w-4 shrink-0 text-primary',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Botón rápido para crear cliente */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled}
        onClick={() => {
          setErrorCrear(null);
          setNuevoNombre('');
          setNuevoDniRuc('');
          setNuevoTelefono('');
          setCrearOpen(true);
        }}
        title="Registrar cliente rápido"
        className="shrink-0 h-9 w-9"
      >
        <Plus className="h-4 w-4" />
      </Button>

      {/* Modal: Registrar Cliente Rápido */}
      <Dialog open={crearOpen} onOpenChange={setCrearOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCrearCliente}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Registrar Cliente Rápido
              </DialogTitle>
              <DialogDescription>
                Registra los datos básicos del cliente para esta venta. Podrás completar más detalles después en el módulo de clientes.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Nombre del Cliente
                </label>
                <Input
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Ej. Juan Pérez (opcional)"
                  className="h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" /> DNI / RUC
                  </label>
                  <Input
                    value={nuevoDniRuc}
                    onChange={(e) => setNuevoDniRuc(e.target.value)}
                    placeholder="8 u 11 dígitos"
                    maxLength={11}
                    className="h-9 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Teléfono / Celular
                  </label>
                  <Input
                    value={nuevoTelefono}
                    onChange={(e) => setNuevoTelefono(e.target.value)}
                    placeholder="9 dígitos"
                    maxLength={15}
                    className="h-9 font-mono text-xs"
                  />
                </div>
              </div>

              {errorCrear && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="text-xs">{errorCrear}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCrearOpen(false)}
                disabled={guardandoCliente}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={guardandoCliente}>
                {guardandoCliente && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Guardar Cliente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
