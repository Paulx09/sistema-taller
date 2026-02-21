import { useState, useEffect } from 'react';
import { useCategorias } from '@/hooks/useCategorias';
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
import { CategoriaForm } from '@/components/forms/CategoriaForm';
import type { Categoria } from '@/types';

export function CategoriasPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Calcular skip para la paginación
  const skip = (currentPage - 1) * itemsPerPage;

  const { categorias, total, loading, error, createCategoria, updateCategoria, deleteCategoria } =
    useCategorias({ skip, take: itemsPerPage });

  // Resetear a página 1 cuando cambien los items por página
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingCategoria(null);
    setDialogOpen(true);
  };

  const handleEdit = (categoria: Categoria) => {
    setEditingCategoria(categoria);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategoria(id);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Error al eliminar:', err);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategoria(null);
  };

  if (loading && categorias.length === 0) {
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
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Categorías</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona las categorías de tus productos
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Categoría
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategoria ? 'Editar Categoría' : 'Nueva Categoría'}
              </DialogTitle>
              <DialogDescription>
                {editingCategoria
                  ? 'Modifica los datos de la categoría'
                  : 'Completa los datos para crear una nueva categoría'}
              </DialogDescription>
            </DialogHeader>
            <CategoriaForm
              categoria={editingCategoria}
              onSuccess={handleCloseDialog}
              onCreate={createCategoria}
              onUpdate={updateCategoria}
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

      {/* Tabla de categorías */}
      <div className="bg-card border rounded-lg shadow-sm overflow-hidden flex flex-col">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10 w-full">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-bold uppercase tracking-wider h-10 pl-4 text-left">Nombre</TableHead>
              <TableHead className="text-right text-xs font-bold uppercase tracking-wider h-10 pr-4">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y">
            {categorias.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground h-32">
                  No hay categorías registradas
                </TableCell>
              </TableRow>
            ) : (
              categorias.map((categoria) => (
                <TableRow key={categoria.id} className="hover:bg-muted/50 transition-colors group">
                  <TableCell className="py-2 pl-4 font-medium text-sm text-foreground">{categoria.nombre}</TableCell>
                  <TableCell className="py-2 pr-4 text-right">
                    <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => handleEdit(categoria)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {deleteConfirmId === categoria.id ? (
                        <div className="flex gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(categoria.id)}
                          >
                            Confirmar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
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
                          onClick={() => setDeleteConfirmId(categoria.id)}
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
