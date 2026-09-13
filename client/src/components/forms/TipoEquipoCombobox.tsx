import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, Loader2, Settings, Pencil, Trash2, X, KeyRound } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { tipoEquipoService } from '@/services/tipo-equipo.service';
import type { TipoEquipo } from '@/types';

interface TipoEquipoComboboxProps {
  value?: string; // id o nombre
  onChange: (tipoEquipoId: string, tipoEquipoNombre?: string, requiereClave?: boolean) => void;
  tiposEquipo: TipoEquipo[];
  onTipoEquipoCreado?: (tipo: TipoEquipo) => void;
  onTipoEquipoActualizado?: (tipo: TipoEquipo) => void;
  onTipoEquipoEliminado?: (id: string) => void;
  onRefresh?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function TipoEquipoCombobox({
  value,
  onChange,
  tiposEquipo,
  onTipoEquipoCreado,
  onTipoEquipoActualizado,
  onTipoEquipoEliminado,
  onRefresh,
  disabled,
  placeholder = 'Seleccionar tipo...',
}: Readonly<TipoEquipoComboboxProps>) {
  const [open, setOpen] = useState(false);
  const [crearOpen, setCrearOpen] = useState(false);
  const [gestionarOpen, setGestionarOpen] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoRequiereClave, setNuevoRequiereClave] = useState(false);
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  // Estados de gestión
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoNombre, setEditandoNombre] = useState('');
  const [editandoRequiereClave, setEditandoRequiereClave] = useState(false);
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [gestionError, setGestionError] = useState<string | null>(null);

  // Label local para mostrar el tipo seleccionado
  const [selectedLabel, setSelectedLabel] = useState<string>(() => {
    if (!value) return '';
    const found = tiposEquipo.find((t) => t.id === value || t.nombre.toLowerCase() === value.toLowerCase());
    return found ? found.nombre : value;
  });

  useEffect(() => {
    if (value) {
      const found = tiposEquipo.find((t) => t.id === value || t.nombre.toLowerCase() === value.toLowerCase());
      if (found) {
        setSelectedLabel(found.nombre);
      } else {
        setSelectedLabel(value);
      }
    } else {
      setSelectedLabel('');
    }
  }, [value, tiposEquipo]);

  const handleCrear = async () => {
    const nombre = nuevoNombre.trim();
    if (!nombre) {
      setErrorCrear('El nombre es requerido');
      return;
    }
    setCreando(true);
    setErrorCrear(null);
    try {
      const nuevo = await tipoEquipoService.create({
        nombre,
        requiereClave: nuevoRequiereClave,
      });
      setSelectedLabel(nuevo.nombre);
      onChange(nuevo.id, nuevo.nombre, nuevo.requiereClave);
      onTipoEquipoCreado?.(nuevo);
      onRefresh?.();
      setNuevoNombre('');
      setNuevoRequiereClave(false);
      setCrearOpen(false);
    } catch (err) {
      const e = err as { response?: { data?: { error?: string; message?: string } } };
      setErrorCrear(
        e.response?.data?.error || e.response?.data?.message || 'Error al crear tipo de equipo'
      );
    } finally {
      setCreando(false);
    }
  };

  const handleOpenCrear = (nombreInicial = '') => {
    setNuevoNombre(nombreInicial);
    setNuevoRequiereClave(false);
    setErrorCrear(null);
    setCrearOpen(true);
  };

  const handleGuardarEdicion = async (id: string) => {
    const nombre = editandoNombre.trim();
    if (!nombre) return;
    setGuardandoEdit(true);
    setGestionError(null);
    try {
      const actualizado = await tipoEquipoService.update(id, {
        nombre,
        requiereClave: editandoRequiereClave,
      });
      onTipoEquipoActualizado?.(actualizado);
      onRefresh?.();
      if (value === id || selectedLabel === tiposEquipo.find((t) => t.id === id)?.nombre) {
        setSelectedLabel(actualizado.nombre);
        onChange(actualizado.id, actualizado.nombre, actualizado.requiereClave);
      }
      setEditandoId(null);
      setEditandoNombre('');
    } catch (err) {
      const e = err as { response?: { data?: { error?: string; message?: string } } };
      setGestionError(
        e.response?.data?.error || e.response?.data?.message || 'Error al actualizar tipo de equipo'
      );
    } finally {
      setGuardandoEdit(false);
    }
  };

  const handleEliminar = async (id: string) => {
    setEliminandoId(id);
    setGestionError(null);
    const itemEliminado = tiposEquipo.find((t) => t.id === id);
    try {
      await tipoEquipoService.delete(id);
      onTipoEquipoEliminado?.(id);
      onRefresh?.();
      if (value === id || (itemEliminado && selectedLabel.toLowerCase() === itemEliminado.nombre.toLowerCase())) {
        setSelectedLabel('');
        onChange('', '', false);
      }
    } catch (err) {
      const e = err as { response?: { data?: { error?: string; message?: string } } };
      setGestionError(
        e.response?.data?.error || e.response?.data?.message || 'No se puede eliminar el tipo de equipo'
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
            className="flex-1 justify-between bg-background border-border font-normal h-8 px-2.5 min-w-0"
          >
            <span className={cn('truncate text-xs', !selectedLabel && 'text-muted-foreground')}>
              {selectedLabel || placeholder}
            </span>
            <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar tipo de equipo..." className="text-xs h-8" />
            <CommandList>
              <CommandEmpty className="p-2 text-xs text-muted-foreground text-center">
                No se encontraron tipos.
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
                  + Crear nuevo tipo
                </Button>
              </CommandEmpty>
              <CommandGroup>
                {tiposEquipo.map((t) => (
                  <CommandItem
                    key={t.id}
                    value={t.nombre}
                    onSelect={() => {
                      setSelectedLabel(t.nombre);
                      onChange(t.id, t.nombre, t.requiereClave);
                      setOpen(false);
                    }}
                    className="text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Check
                        className={cn(
                          'mr-2 h-3.5 w-3.5 shrink-0',
                          value === t.id || value === t.nombre ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span>{t.nombre}</span>
                    </div>
                    {t.requiereClave && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500/40 text-amber-600 dark:text-amber-400 gap-0.5">
                        <KeyRound className="h-2.5 w-2.5" />
                        Clave
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Botón rápido para crear tipo de equipo */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled}
        onClick={() => handleOpenCrear()}
        title="Nuevo tipo de equipo"
        className="shrink-0 h-8 w-8"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>

      {/* Botón para gestionar tipos en Pop-Up */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={() => {
          setGestionError(null);
          setGestionarOpen(true);
        }}
        title="Gestionar tipos de equipo"
        className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
      >
        <Settings className="h-3.5 w-3.5" />
      </Button>

      {/* Diálogo Pop-up: Crear Tipo de Equipo */}
      <Dialog open={crearOpen} onOpenChange={setCrearOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Nuevo Tipo de Equipo</DialogTitle>
            <DialogDescription className="text-xs">
              Registra una categoría de dispositivo para el taller técnico.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label htmlFor="nuevo-tipo-nombre" className="text-xs">Nombre del Tipo *</Label>
              <Input
                id="nuevo-tipo-nombre"
                value={nuevoNombre}
                onChange={(e) => {
                  setNuevoNombre(e.target.value);
                  setErrorCrear(null);
                }}
                placeholder="Ej: Laptop, PC Gamer, Tablet, Smartwatch..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCrear();
                  }
                }}
                autoFocus
                className="h-8 text-xs"
              />
              {errorCrear && <p className="text-xs text-destructive">{errorCrear}</p>}
            </div>

            <div className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg border border-border">
              <div className="space-y-0.5">
                <Label htmlFor="nuevo-tipo-clave" className="text-xs font-medium cursor-pointer">
                  ¿Requiere Clave / Patrón?
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Habilita el campo de contraseña al recibir el equipo.
                </p>
              </div>
              <Switch
                id="nuevo-tipo-clave"
                checked={nuevoRequiereClave}
                onCheckedChange={setNuevoRequiereClave}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCrearOpen(false)}
              disabled={creando}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCrear}
              disabled={creando || !nuevoNombre.trim()}
              className="text-xs"
            >
              {creando && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Guardar Tipo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo Pop-up: Gestionar Tipos de Equipo */}
      <Dialog open={gestionarOpen} onOpenChange={setGestionarOpen}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Gestión de Tipos de Equipo</DialogTitle>
            <DialogDescription className="text-xs">
              Modifica nombres, requerimiento de clave o elimina tipos registrados.
            </DialogDescription>
          </DialogHeader>

          {gestionError && (
            <div className="p-2.5 rounded-md bg-destructive/10 text-destructive text-xs">
              {gestionError}
            </div>
          )}

          <div className="overflow-y-auto flex-1 divide-y border rounded-md my-2 max-h-60">
            {tiposEquipo.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No hay tipos de equipo registrados.
              </div>
            ) : (
              tiposEquipo.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-2.5 hover:bg-muted/40 gap-2">
                  {editandoId === t.id ? (
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex items-center gap-1.5">
                        <Input
                          size={1}
                          className="h-7 text-xs flex-1"
                          value={editandoNombre}
                          onChange={(e) => setEditandoNombre(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleGuardarEdicion(t.id);
                            if (e.key === 'Escape') setEditandoId(null);
                          }}
                        />
                        <Button
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => handleGuardarEdicion(t.id)}
                          disabled={guardandoEdit || !editandoNombre.trim()}
                        >
                          {guardandoEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Guardar'}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={() => setEditandoId(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] text-muted-foreground">¿Requiere clave de desbloqueo?</span>
                        <Switch
                          checked={editandoRequiereClave}
                          onCheckedChange={setEditandoRequiereClave}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xs font-medium text-foreground">{t.nombre}</span>
                        {t.requiereClave && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-amber-500/40 text-amber-600 dark:text-amber-400 gap-0.5">
                            <KeyRound className="h-2.5 w-2.5" />
                            Clave
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => {
                            setEditandoId(t.id);
                            setEditandoNombre(t.nombre);
                            setEditandoRequiereClave(t.requiereClave);
                          }}
                          title="Editar tipo"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleEliminar(t.id)}
                          disabled={eliminandoId === t.id}
                          title="Eliminar tipo"
                        >
                          {eliminandoId === t.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
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
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Nuevo Tipo
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setGestionarOpen(false)}
              className="text-xs"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
