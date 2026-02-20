import { useState, useEffect } from 'react';
import { useUbicaciones } from '@/hooks/useUbicaciones';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Pagination } from '@/components/Pagination';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { UbicacionForm } from '@/components/forms/UbicacionForm';
import type { Ubicacion } from '@/types';

export function UbicacionesPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Calcular skip para la paginación
  const skip = (currentPage - 1) * itemsPerPage;

  const { ubicaciones, total, loading, error, createUbicacion, updateUbicacion, deleteUbicacion } =
    useUbicaciones({ skip, take: itemsPerPage });

  // Resetear a página 1 cuando cambien los items por página
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUbicacion, setEditingUbicacion] = useState<Ubicacion | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingUbicacion(null);
    setDialogOpen(true);
  };

  const handleEdit = (ubicacion: Ubicacion) => {
    setEditingUbicacion(ubicacion);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUbicacion(id);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Error al eliminar:', err);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUbicacion(null);
  };

  if (loading && ubicaciones.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con botón de crear */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Ubicaciones</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona las ubicaciones de tu inventario
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Ubicación
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUbicacion ? 'Editar Ubicación' : 'Nueva Ubicación'}
              </DialogTitle>
              <DialogDescription>
                {editingUbicacion
                  ? 'Modifica los datos de la ubicación'
                  : 'Completa los datos para crear una nueva ubicación'}
              </DialogDescription>
            </DialogHeader>
            <UbicacionForm
              ubicacion={editingUbicacion}
              onSuccess={handleCloseDialog}
              onCreate={createUbicacion}
              onUpdate={updateUbicacion}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Mensaje de error */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabla de ubicaciones */}
      <div className="bg-card border rounded-lg shadow-sm overflow-hidden flex flex-col">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10 w-full">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-bold uppercase tracking-wider h-10 pl-4 text-left">Nombre</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider h-10 text-left">Descripción</TableHead>
              <TableHead className="text-right text-xs font-bold uppercase tracking-wider h-10 pr-4">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y">
            {ubicaciones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground h-32">
                  No hay ubicaciones registradas
                </TableCell>
              </TableRow>
            ) : (
              ubicaciones.map((ubicacion) => (
                <TableRow key={ubicacion.id} className="hover:bg-muted/50 transition-colors group">
                  <TableCell className="py-2 pl-4 font-medium text-sm text-foreground">{ubicacion.nombre}</TableCell>
                  <TableCell className="py-2 text-sm text-muted-foreground">
                    {ubicacion.descripcion || '-'}
                  </TableCell>
                  <TableCell className="py-2 pr-4 text-right">
                    <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => handleEdit(ubicacion)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {deleteConfirmId === ubicacion.id ? (
                        <div className="flex gap-1 items-center">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => handleDelete(ubicacion.id)}
                          >
                            Confirmar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => setDeleteConfirmId(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteConfirmId(ubicacion.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <Pagination
          currentPage={currentPage}
          totalItems={total}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>
    </div>
  );
}
