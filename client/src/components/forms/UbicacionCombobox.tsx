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
import { ubicacionService } from '@/services/ubicacion.service';
import type { Ubicacion } from '@/types';

interface UbicacionComboboxProps {
  value?: string; // id o nombre
  onChange: (ubicacionId: string, ubicacionNombre?: string) => void;
  ubicaciones: Ubicacion[];
  onUbicacionCreada?: (ubicacion: Ubicacion) => void;
  onUbicacionActualizada?: (ubicacion: Ubicacion) => void;
  onUbicacionEliminada?: (id: string) => void;
  onRefresh?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function UbicacionCombobox({
  value,
  onChange,
  ubicaciones,
  onUbicacionCreada,
  onUbicacionActualizada,
  onUbicacionEliminada,
  onRefresh,
  disabled,
  placeholder = 'Seleccionar ubicación...',
}: Readonly<UbicacionComboboxProps>) {
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

  // Label local para mostrar la ubicación seleccionada
  const [selectedLabel, setSelectedLabel] = useState<string>(() => {
    if (!value) return '';
    const found = ubicaciones.find((u) => u.id === value || u.nombre.toLowerCase() === value.toLowerCase());
    return found ? found.nombre : value;
  });

  useEffect(() => {
    if (value) {
      const found = ubicaciones.find((u) => u.id === value || u.nombre.toLowerCase() === value.toLowerCase());
      if (found) setSelectedLabel(found.nombre);
      else setSelectedLabel(value);
    } else {
      setSelectedLabel('');
    }
  }, [value, ubicaciones]);

  const handleCrear = async () => {
    const nombre = nuevoNombre.trim();
    if (!nombre) {
      setErrorCrear('El nombre es requerido');
      return;
    }
    setCreando(true);
    setErrorCrear(null);
    try {
      const nueva = await ubicacionService.create({ nombre });
      setSelectedLabel(nueva.nombre);
      onChange(nueva.id, nueva.nombre);
      onUbicacionCreada?.(nueva);
      onRefresh?.();
      setNuevoNombre('');
      setCrearOpen(false);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string; error?: string } } };
      setErrorCrear(
        e.response?.data?.message || e.response?.data?.error || 'Error al crear ubicación'
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
      const actualizada = await ubicacionService.update(id, { nombre });
      onUbicacionActualizada?.(actualizada);
      onRefresh?.();
      if (value === id || selectedLabel === ubicaciones.find((u) => u.id === id)?.nombre) {
        setSelectedLabel(actualizada.nombre);
        onChange(actualizada.id, actualizada.nombre);
      }
      setEditandoId(null);
      setEditandoNombre('');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string; error?: string } } };
      setGestionError(
        e.response?.data?.message || e.response?.data?.error || 'Error al actualizar ubicación'
      );
    } finally {
      setGuardandoEdit(false);
    }
  };

  const handleEliminar = async (id: string) => {
    setEliminandoId(id);
    setGestionError(null);
    const itemEliminado = ubicaciones.find((u) => u.id === id);
    try {
      await ubicacionService.delete(id);
      onUbicacionEliminada?.(id);
      onRefresh?.();
      if (value === id || (itemEliminado && selectedLabel.toLowerCase() === itemEliminado.nombre.toLowerCase())) {
        setSelectedLabel('');
        onChange('', '');
      }
    } catch (err) {
      const e = err as { response?: { data?: { message?: string; error?: string } } };
      setGestionError(
        e.response?.data?.message || e.response?.data?.error || 'No se puede eliminar la ubicación porque tiene productos asignados'
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
            <CommandInput placeholder="Buscar ubicación..." />
            <CommandList>
              <CommandEmpty className="p-2 text-xs text-muted-foreground text-center">
                No se encontraron ubicaciones.
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
                  + Crear nueva ubicación
                </Button>
              </CommandEmpty>
              <CommandGroup>
                {ubicaciones.map((u) => (
                  <CommandItem
                    key={u.id}
                    value={u.nombre}
                    onSelect={() => {
                      setSelectedLabel(u.nombre);
                      onChange(u.id, u.nombre);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 shrink-0',
                        value === u.id || value === u.nombre ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {u.nombre}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Botón rápido para crear ubicación */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled}
        onClick={handleOpenCrear}
        title="Nueva ubicación"
        className="shrink-0 h-9 w-9"
      >
        <Plus className="h-4 w-4" />
      </Button>

      {/* Botón para gestionar ubicaciones en Pop-Up */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={() => {
          setGestionError(null);
          setGestionarOpen(true);
        }}
        title="Gestionar ubicaciones (editar o eliminar)"
        className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
      >
        <Settings className="h-4 w-4" />
      </Button>

      {/* Diálogo Pop-up: Crear Ubicación */}
      <Dialog open={crearOpen} onOpenChange={setCrearOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva Ubicación</DialogTitle>
            <DialogDescription>
              Ingresa el nombre del estante, gaveta o vitrina física.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="nueva-ubi-nombre">Nombre de la Ubicación *</Label>
            <Input
              id="nueva-ubi-nombre"
              value={nuevoNombre}
              onChange={(e) => {
                setNuevoNombre(e.target.value);
                setErrorCrear(null);
              }}
              placeholder="Ej: Vitrina 1, Estante A-2, Taller..."
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
              Guardar Ubicación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo Pop-up: Gestionar Ubicaciones (CRUD completo en Pop-up) */}
      <Dialog open={gestionarOpen} onOpenChange={setGestionarOpen}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Gestión de Ubicaciones Físicas</DialogTitle>
            <DialogDescription>
              Edita o elimina ubicaciones físicas registradas en el sistema.
            </DialogDescription>
          </DialogHeader>

          {gestionError && (
            <div className="p-2.5 rounded-md bg-destructive/10 text-destructive text-xs">
              {gestionError}
            </div>
          )}

          <div className="overflow-y-auto flex-1 divide-y border rounded-md my-2">
            {ubicaciones.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No hay ubicaciones registradas.
              </div>
            ) : (
              ubicaciones.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-2.5 hover:bg-muted/40 gap-2">
                  {editandoId === u.id ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <Input
                        size={1}
                        className="h-8 text-xs"
                        value={editandoNombre}
                        onChange={(e) => setEditandoNombre(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleGuardarEdicion(u.id);
                          if (e.key === 'Escape') setEditandoId(null);
                        }}
                      />
                      <Button
                        size="sm"
                        className="h-8 text-xs px-2"
                        onClick={() => handleGuardarEdicion(u.id)}
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
                      <span className="text-sm font-medium text-foreground truncate">{u.nombre}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => {
                            setEditandoId(u.id);
                            setEditandoNombre(u.nombre);
                          }}
                          title="Editar nombre de ubicación"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleEliminar(u.id)}
                          disabled={eliminandoId === u.id}
                          title="Eliminar ubicación"
                        >
                          {eliminandoId === u.id ? (
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
              Nueva Ubicación
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
