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
import { categoriaService } from '@/services/categoria.service';
import type { Categoria, TipoItem } from '@/types';

interface CategoriaComboboxProps {
  value?: string; // id o nombre
  onChange: (categoriaId: string, categoriaNombre?: string) => void;
  categorias: Categoria[];
  tipo?: TipoItem;
  showCreateButton?: boolean;
  showSettingsButton?: boolean;
  onCategoriaCreada?: (categoria: Categoria) => void;
  onCategoriaActualizada?: (categoria: Categoria) => void;
  onCategoriaEliminada?: (id: string) => void;
  onRefresh?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function CategoriaCombobox({
  value,
  onChange,
  categorias,
  tipo = 'PRODUCTO',
  showCreateButton = true,
  showSettingsButton = true,
  onCategoriaCreada,
  onCategoriaActualizada,
  onCategoriaEliminada,
  onRefresh,
  disabled,
  placeholder = 'Seleccionar categoría...',
}: Readonly<CategoriaComboboxProps>) {
  const [open, setOpen] = useState(false);
  const [crearOpen, setCrearOpen] = useState(false);
  const [gestionarOpen, setGestionarOpen] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState<TipoItem>(tipo);
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  // Estados de gestión
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoNombre, setEditandoNombre] = useState('');
  const [editandoTipo, setEditandoTipo] = useState<TipoItem>('PRODUCTO');
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [gestionError, setGestionError] = useState<string | null>(null);

  // Filtrar categorías por el tipo seleccionado si viene especificado
  const categoriasFiltradas = tipo 
    ? categorias.filter((c) => !c.tipo || c.tipo === tipo)
    : categorias;

  // Label local para mostrar la categoría seleccionada
  const [selectedLabel, setSelectedLabel] = useState<string>(() => {
    if (!value) return '';
    const found = categorias.find((c) => c.id === value || c.nombre.toLowerCase() === value.toLowerCase());
    return found ? found.nombre : value;
  });

  useEffect(() => {
    if (value) {
      const found = categorias.find((c) => c.id === value || c.nombre.toLowerCase() === value.toLowerCase());
      if (found) setSelectedLabel(found.nombre);
      else setSelectedLabel(value);
    } else {
      setSelectedLabel('');
    }
  }, [value, categorias]);

  useEffect(() => {
    setNuevoTipo(tipo);
  }, [tipo]);

  const handleCrear = async () => {
    const nombre = nuevoNombre.trim().toUpperCase();
    if (!nombre) {
      setErrorCrear('El nombre es requerido');
      return;
    }
    setCreando(true);
    setErrorCrear(null);
    try {
      const nueva = await categoriaService.create({ nombre, tipo: nuevoTipo });
      setSelectedLabel(nueva.nombre);
      onChange(nueva.id, nueva.nombre);
      onCategoriaCreada?.(nueva);
      onRefresh?.();
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
    setNuevoTipo(tipo);
    setErrorCrear(null);
    setCrearOpen(true);
  };

  const handleGuardarEdicion = async (id: string) => {
    const nombre = editandoNombre.trim().toUpperCase();
    if (!nombre) return;
    setGuardandoEdit(true);
    setGestionError(null);
    try {
      const actualizada = await categoriaService.update(id, { nombre, tipo: editandoTipo });
      onCategoriaActualizada?.(actualizada);
      onRefresh?.();
      if (value === id || selectedLabel === categorias.find((c) => c.id === id)?.nombre) {
        setSelectedLabel(actualizada.nombre);
        onChange(actualizada.id, actualizada.nombre);
      }
      setEditandoId(null);
      setEditandoNombre('');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string; error?: string } } };
      setGestionError(
        e.response?.data?.message || e.response?.data?.error || 'Error al actualizar categoría'
      );
    } finally {
      setGuardandoEdit(false);
    }
  };

  const handleEliminar = async (id: string) => {
    setEliminandoId(id);
    setGestionError(null);
    const itemEliminado = categorias.find((c) => c.id === id);
    try {
      await categoriaService.delete(id);
      onCategoriaEliminada?.(id);
      onRefresh?.();
      if (value === id || (itemEliminado && selectedLabel.toLowerCase() === itemEliminado.nombre.toLowerCase())) {
        setSelectedLabel('');
        onChange('', '');
      }
    } catch (err) {
      const e = err as { response?: { data?: { message?: string; error?: string } } };
      setGestionError(
        e.response?.data?.message || e.response?.data?.error || 'No se puede eliminar la categoría porque tiene productos asignados'
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
            <CommandInput placeholder="Buscar categoría..." />
            <CommandList>
              <CommandEmpty className="p-2 text-xs text-muted-foreground text-center">
                No se encontraron categorías de tipo {tipo}.
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
                  + Crear nueva categoría
                </Button>
              </CommandEmpty>
              <CommandGroup>
                {categoriasFiltradas.map((cat) => (
                  <CommandItem
                    key={cat.id}
                    value={cat.nombre}
                    onSelect={() => {
                      setSelectedLabel(cat.nombre);
                      onChange(cat.id, cat.nombre);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 shrink-0',
                        value === cat.id || value === cat.nombre ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex items-center justify-between w-full">
                      <span>{cat.nombre}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{cat.tipo}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Botón rápido para crear categoría */}
      {showCreateButton && (
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
      )}

      {/* Botón para gestionar categorías en Pop-Up */}
      {showSettingsButton && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={() => {
            setGestionError(null);
            setGestionarOpen(true);
          }}
          title="Gestionar categorías (editar o eliminar)"
          className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
        </Button>
      )}

      {/* Diálogo Pop-up: Crear Categoría */}
      <Dialog open={crearOpen} onOpenChange={setCrearOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva Categoría</DialogTitle>
            <DialogDescription>
              Ingresa el nombre para clasificar ítems ({tipo.toLowerCase()}) en el sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label htmlFor="nueva-cat-nombre">Nombre de la Categoría *</Label>
              <Input
                id="nueva-cat-nombre"
                value={nuevoNombre}
                onChange={(e) => {
                  setNuevoNombre(e.target.value.toUpperCase());
                  setErrorCrear(null);
                }}
                placeholder="Ej: MOUSE GAMER / LIMPIEZA DE CABEZAL"
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
              Guardar Categoría
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo Pop-up: Gestionar Categorías (CRUD completo en Pop-up) */}
      <Dialog open={gestionarOpen} onOpenChange={setGestionarOpen}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Gestión de Categorías</DialogTitle>
            <DialogDescription>
              Edita o elimina categorías registradas en el sistema.
            </DialogDescription>
          </DialogHeader>

          {gestionError && (
            <div className="p-2.5 rounded-md bg-destructive/10 text-destructive text-xs">
              {gestionError}
            </div>
          )}

          <div className="overflow-y-auto flex-1 divide-y border rounded-md my-2">
            {categorias.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No hay categorías registradas.
              </div>
            ) : (
              categorias.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2.5 hover:bg-muted/40 gap-2">
                  {editandoId === c.id ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <Input
                        size={1}
                        className="h-8 text-xs flex-1"
                        value={editandoNombre}
                        onChange={(e) => setEditandoNombre(e.target.value.toUpperCase())}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleGuardarEdicion(c.id);
                          if (e.key === 'Escape') setEditandoId(null);
                        }}
                      />
                      <Button
                        size="sm"
                        className="h-8 text-xs px-2"
                        onClick={() => handleGuardarEdicion(c.id)}
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
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-sm font-medium text-foreground truncate">{c.nombre}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase font-semibold">
                          {c.tipo || 'PRODUCTO'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => {
                            setEditandoId(c.id);
                            setEditandoNombre(c.nombre);
                            setEditandoTipo(c.tipo || 'PRODUCTO');
                          }}
                          title="Editar categoría"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleEliminar(c.id)}
                          disabled={eliminandoId === c.id}
                          title="Eliminar categoría"
                        >
                          {eliminandoId === c.id ? (
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

          <DialogFooter className="flex justify-end items-center pt-2">
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
