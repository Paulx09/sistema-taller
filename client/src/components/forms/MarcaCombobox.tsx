import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, Loader2, Settings, Pencil, Trash2, X } from 'lucide-react';
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
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { marcaService } from '@/services/marca.service';
import type { Marca } from '@/types';

interface MarcaComboboxProps {
  value?: string; // id o nombre
  onChange: (marcaId: string, marcaNombre?: string) => void;
  marcas: Marca[];
  onMarcaCreada?: (marca: Marca) => void;
  onMarcaActualizada?: (marca: Marca) => void;
  onMarcaEliminada?: (id: string) => void;
  onRefresh?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MarcaCombobox({
  value,
  onChange,
  marcas,
  onMarcaCreada,
  onMarcaActualizada,
  onMarcaEliminada,
  onRefresh,
  disabled,
  placeholder = 'Seleccionar marca...',
}: Readonly<MarcaComboboxProps>) {
  const [open, setOpen] = useState(false);
  const [crearOpen, setCrearOpen] = useState(false);
  const [gestionarOpen, setGestionarOpen] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  // Estados de gestión
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoNombre, setEditandoNombre] = useState('');
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [gestionError, setGestionError] = useState<string | null>(null);

  // Label local para mostrar la marca seleccionada
  const [selectedLabel, setSelectedLabel] = useState<string>(() => {
    if (!value) return '';
    const found = marcas.find((m) => m.id === value || m.nombre.toLowerCase() === value.toLowerCase());
    return found ? found.nombre : value;
  });

  useEffect(() => {
    if (value) {
      const found = marcas.find((m) => m.id === value || m.nombre.toLowerCase() === value.toLowerCase());
      if (found) setSelectedLabel(found.nombre);
      else setSelectedLabel(value);
    } else {
      setSelectedLabel('');
    }
  }, [value, marcas]);

  const handleCrear = async () => {
    const nombre = nuevoNombre.trim();
    if (!nombre) {
      setErrorCrear('El nombre es requerido');
      return;
    }
    setCreando(true);
    setErrorCrear(null);
    try {
      const nueva = await marcaService.create({ nombre });
      setSelectedLabel(nueva.nombre);
      onChange(nueva.id, nueva.nombre);
      onMarcaCreada?.(nueva);
      onRefresh?.();
      setNuevoNombre('');
      setCrearOpen(false);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string; error?: string } } };
      setErrorCrear(
        e.response?.data?.message || e.response?.data?.error || 'Error al crear marca'
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

  const handleGuardarEdicion = async (id: string) => {
    const nombre = editandoNombre.trim();
    if (!nombre) return;
    setGuardandoEdit(true);
    setGestionError(null);
    try {
      const actualizada = await marcaService.update(id, { nombre });
      onMarcaActualizada?.(actualizada);
      onRefresh?.();
      if (value === id || selectedLabel === marcas.find((m) => m.id === id)?.nombre) {
        setSelectedLabel(actualizada.nombre);
        onChange(actualizada.id, actualizada.nombre);
      }
      setEditandoId(null);
      setEditandoNombre('');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string; error?: string } } };
      setGestionError(
        e.response?.data?.message || e.response?.data?.error || 'Error al actualizar marca'
      );
    } finally {
      setGuardandoEdit(false);
    }
  };

  const handleEliminar = async (id: string) => {
    setEliminandoId(id);
    setGestionError(null);
    const itemEliminado = marcas.find((m) => m.id === id);
    try {
      await marcaService.delete(id);
      onMarcaEliminada?.(id);
      onRefresh?.();
      if (value === id || (itemEliminado && selectedLabel.toLowerCase() === itemEliminado.nombre.toLowerCase())) {
        setSelectedLabel('');
        onChange('', '');
      }
    } catch (err) {
      const e = err as { response?: { data?: { message?: string; error?: string } } };
      setGestionError(
        e.response?.data?.message || e.response?.data?.error || 'No se puede eliminar la marca'
      );
    } finally {
      setEliminandoId(null);
    }
  };

  return (
    <div className="flex gap-1.5 items-center w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="flex-1 justify-between bg-background border-border font-normal h-9 px-3 min-w-0"
          >
            <span className={cn('truncate text-sm', !selectedLabel && 'text-muted-foreground')}>
              {selectedLabel || placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar marca..." />
            <CommandList>
              <CommandEmpty className="p-2 text-xs text-muted-foreground text-center">
                No se encontraron marcas.
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-primary block mx-auto mt-1"
                  onClick={() => {
                    setOpen(false);
                    handleOpenCrear();
                  }}
                >
                  + Crear nueva marca
                </Button>
              </CommandEmpty>
              <CommandGroup>
                {marcas.map((m) => (
                  <CommandItem
                    key={m.id}
                    value={m.nombre}
                    onSelect={() => {
                      setSelectedLabel(m.nombre);
                      onChange(m.id, m.nombre);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 shrink-0',
                        value === m.id || value === m.nombre ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {m.nombre}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Botón rápido para crear marca */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled}
        onClick={handleOpenCrear}
        title="Nueva marca"
        className="shrink-0 h-9 w-9"
      >
        <Plus className="h-4 w-4" />
      </Button>

      {/* Botón para gestionar marcas en Pop-Up */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={() => {
          setGestionError(null);
          setGestionarOpen(true);
        }}
        title="Gestionar marcas (editar o eliminar)"
        className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
      >
        <Settings className="h-4 w-4" />
      </Button>

      {/* Diálogo Pop-up: Crear Marca */}
      <Dialog open={crearOpen} onOpenChange={setCrearOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva Marca</DialogTitle>
            <DialogDescription>
              Ingresa el nombre del fabricante o marca comercial.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="nueva-marca-nombre">Nombre de la Marca *</Label>
            <Input
              id="nueva-marca-nombre"
              value={nuevoNombre}
              onChange={(e) => {
                setNuevoNombre(e.target.value);
                setErrorCrear(null);
              }}
              placeholder="Ej: ASUS, Kingston, HP, Logitech..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCrear();
                }
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
              Guardar Marca
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo Pop-up: Gestionar Marcas (CRUD completo en Pop-up) */}
      <Dialog open={gestionarOpen} onOpenChange={setGestionarOpen}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Gestión de Marcas</DialogTitle>
            <DialogDescription>
              Edita o elimina marcas existentes registradas en el sistema.
            </DialogDescription>
          </DialogHeader>

          {gestionError && (
            <div className="p-2.5 rounded-md bg-destructive/10 text-destructive text-xs">
              {gestionError}
            </div>
          )}

          <div className="overflow-y-auto flex-1 divide-y border rounded-md my-2">
            {marcas.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No hay marcas registradas.
              </div>
            ) : (
              marcas.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2.5 hover:bg-muted/40 gap-2">
                  {editandoId === m.id ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <Input
                        size={1}
                        className="h-8 text-xs"
                        value={editandoNombre}
                        onChange={(e) => setEditandoNombre(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleGuardarEdicion(m.id);
                          if (e.key === 'Escape') setEditandoId(null);
                        }}
                      />
                      <Button
                        size="sm"
                        className="h-8 text-xs px-2"
                        onClick={() => handleGuardarEdicion(m.id)}
                        disabled={guardandoEdit || !editandoNombre.trim()}
                      >
                        {guardandoEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Guardar'}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => setEditandoId(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-foreground truncate">{m.nombre}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => {
                            setEditandoId(m.id);
                            setEditandoNombre(m.nombre);
                          }}
                          title="Editar nombre de marca"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleEliminar(m.id)}
                          disabled={eliminandoId === m.id}
                          title="Eliminar marca"
                        >
                          {eliminandoId === m.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          <DialogFooter className="flex justify-between sm:justify-between items-center pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setGestionarOpen(false);
                handleOpenCrear();
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Nueva Marca
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setGestionarOpen(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
