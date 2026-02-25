import { useState, useEffect } from 'react';
import { FEATURES } from '@/config/features';
import { useProductos } from '@/hooks/useProductos';
import { useCategorias } from '@/hooks/useCategorias';
import { useUbicaciones } from '@/hooks/useUbicaciones';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Pagination } from '@/components/Pagination';

// Helper para construir URL completa de imagen
const getImageUrl = (imagenUrl: string | null): string | null => {
  if (!imagenUrl) return null;
  if (imagenUrl.startsWith('http')) return imagenUrl;
  // Si es ruta relativa, agregar la URL del backend
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const baseUrl = API_URL.replace('/api', ''); // Eliminar /api si existe
  return `${baseUrl}${imagenUrl}`;
};
import { Plus, Pencil, Trash2, Loader2, Filter, Eye} from 'lucide-react';
import { ProductoForm } from '@/components/forms/ProductoForm';
import { ProductoDetalle } from '@/components/ProductoDetalle';
import type { Producto } from '@/types';
import { cn } from '@/lib/utils';

export function ProductosPage() {
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('all');
  const [servicioFilter, setServicioFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Calcular skip para la paginación
  const skip = (currentPage - 1) * itemsPerPage;

  const getEsServicioValue = () => {
    if (servicioFilter === 'true') return true;
    if (servicioFilter === 'false') return false;
    return undefined;
  };

  const { productos, total, loading, error, createProducto, updateProducto, deleteProducto, refetch } =
    useProductos({
      busqueda: busqueda || undefined,
      categoriaId: categoriaFilter === 'all' ? undefined : categoriaFilter,
      esServicio: getEsServicioValue(),
      skip,
      take: itemsPerPage,
    });

  // Resetear a página 1 cuando cambien los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [busqueda, categoriaFilter, servicioFilter, itemsPerPage]);

  const { categorias } = useCategorias();
  const { ubicaciones } = useUbicaciones();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [viewingProducto, setViewingProducto] = useState<Producto | null>(null); // Nuevo estado
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteWarningDialog, setDeleteWarningDialog] = useState<{
    isOpen: boolean;
    productoId: string | null;
    mensaje: string;
  }>({
    isOpen: false,
    productoId: null,
    mensaje: '',
  });

  const handleCreate = () => {
    setEditingProducto(null);
    setViewingProducto(null);
    setSheetOpen(true);
  };

  const handleEdit = (producto: Producto) => {
    setEditingProducto(producto);
    setViewingProducto(null);
    setSheetOpen(true);
  };

  const handleVerDetalle = (producto: Producto) => {
    setViewingProducto(producto);
    setEditingProducto(null);
    setSheetOpen(true);
  };

  const handleDelete = async (id: string, force: boolean = false) => {
    try {
      await deleteProducto(id, force);
      setDeleteConfirmId(null);
      setDeleteWarningDialog({ isOpen: false, productoId: null, mensaje: '' });
    } catch (err: any) {
      console.error('Error al eliminar:', err);
      
      // Detectar si es un error 409 que requiere confirmación
      if (err.response?.status === 409 && err.response?.data?.requiereConfirmacion) {
        setDeleteWarningDialog({
          isOpen: true,
          productoId: id,
          mensaje: err.response.data.mensaje,
        });
        setDeleteConfirmId(null);
      }
    }
  };

  const handleForceDelete = async () => {
    if (deleteWarningDialog.productoId) {
      await handleDelete(deleteWarningDialog.productoId, true);
    }
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
    setEditingProducto(null);
    setViewingProducto(null);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header Page */}
      <div className="flex flex-col gap-4 pb-2">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Inventario Maestro</h2>
              <p className="text-muted-foreground text-sm mt-1">Gestión y control de existencias.</p>
            </div>
            <div className="flex gap-2">
               <Sheet open={sheetOpen} onOpenChange={(open) => {
                   setSheetOpen(open);
                   if (!open) handleCloseSheet();
               }}>
                  <SheetTrigger asChild>
                    <Button onClick={handleCreate} className="font-bold shadow-sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Nuevo Producto
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                    <SheetHeader className="border-b pb-4">
                      <SheetTitle className="text-xl font-bold">
                        {viewingProducto 
                            ? 'Detalle del Producto' 
                            : (editingProducto ? 'Editar Producto' : 'Agregar Nuevo Producto')}
                      </SheetTitle>
                      <SheetDescription>
                        {viewingProducto
                            ? 'Información completa e historial de movimientos.'
                            : (editingProducto
                                ? 'Modifica la información del producto en inventario.'
                                : 'Complete la información para registrar en inventario.')}
                      </SheetDescription>
                    </SheetHeader>
                    
                    {viewingProducto ? (
                        <ProductoDetalle 
                            producto={viewingProducto} 
                            onRefresh={refetch}
                        />
                    ) : (
                        <ProductoForm
                          producto={editingProducto}
                          onSuccess={() => {
                            handleCloseSheet();
                            refetch();
                          }}
                          onCreate={createProducto}
                          onUpdate={updateProducto}
                          categorias={categorias}
                          ubicaciones={ubicaciones}
                        />
                    )}
                  </SheetContent>
                </Sheet>
            </div>
         </div>
         
         {/* Filters Bar */}
         <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-card p-3 rounded-lg border shadow-sm sticky top-0 z-20">
             <div className="relative flex-1 w-full md:max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-muted-foreground text-[18px]">search</span>
                </div>
                <Input
                  placeholder="Buscar producto, marca o SKU..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-9 bg-background border-input focus:ring-1 h-9"
                />
             </div>
             
             <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                  <SelectTrigger className="w-[160px] bg-background border-input h-9 text-sm">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={servicioFilter} onValueChange={setServicioFilter}>
                  <SelectTrigger className="w-[140px] bg-background border-input h-9 text-sm">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="false">Productos</SelectItem>
                    <SelectItem value="true">Servicios</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="h-6 w-px bg-border mx-1"></div>
                
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                   <Filter className="h-4 w-4" />
                </Button>
             </div>
         </div>

         {/* Error Alert */}
         {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
         )}

         {/* Products Table */}
         <div className="bg-card border rounded-lg shadow-sm flex-1 overflow-hidden flex flex-col mb-4">
            <div className="overflow-auto flex-1">
               <Table>
                 <TableHeader className="bg-muted/50 sticky top-0 z-10 w-full">
                   <TableRow className="hover:bg-transparent">
                     <TableHead className="text-xs font-bold uppercase tracking-wider h-10 text-left">Producto</TableHead>
                     <TableHead className="text-xs font-bold uppercase tracking-wider h-10 text-left">Marca / Modelo</TableHead>
                     <TableHead className="text-xs font-bold uppercase tracking-wider h-10 text-left">Categoría</TableHead>
                     <TableHead className="text-xs font-bold uppercase tracking-wider h-10 text-left">Stock</TableHead>
                     <TableHead className="text-xs font-bold uppercase tracking-wider h-10 text-left">Ubicación</TableHead>
                     <TableHead className="text-right text-xs font-bold uppercase tracking-wider h-10">Precio</TableHead>
                     <TableHead className="text-right text-xs font-bold uppercase tracking-wider h-10 w-[100px]">Acciones</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody className="divide-y">
                    {loading && productos.length === 0 ? (
                       <TableRow>
                          <TableCell colSpan={8} className="h-32 text-center">
                             <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                          </TableCell>
                       </TableRow>
                    ) : productos.length === 0 ? (
                       <TableRow>
                          <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                             No se encontraron productos
                          </TableCell>
                       </TableRow>
                    ) : (
                       productos.map((producto) => (
                           <TableRow key={producto.id} className="hover:bg-muted/50 transition-colors group">
                              <TableCell className="py-2">
                                 <div className="flex items-center">
                                    {/* Feature: Imagen del producto - Controlado por config/features.ts */}
                                    {FEATURES.ENABLE_PRODUCT_IMAGES && (
                                      <div className="h-9 w-9 flex-shrink-0 rounded-md bg-muted border border-border flex items-center justify-center overflow-hidden text-muted-foreground">
                                        {getImageUrl(producto.imagenUrl) ? (
                                          <img 
                                            src={getImageUrl(producto.imagenUrl)!} 
                                            alt={producto.nombre} 
                                            className="h-full w-full object-cover" 
                                            onError={(e) => {
                                              // Si la imagen falla al cargar, mostrar el icono
                                              e.currentTarget.style.display = 'none';
                                              e.currentTarget.parentElement!.innerHTML = '<span class="material-symbols-outlined text-[18px]">image</span>';
                                            }}
                                          />
                                        ) : (
                                          <span className="material-symbols-outlined text-[18px]">image</span>
                                        )}
                                      </div>
                                    )}
                                    <div className={FEATURES.ENABLE_PRODUCT_IMAGES ? "ml-3" : ""}>
                                       <div className="text-sm font-medium text-foreground">{producto.nombre}</div>
                                       {/* Feature: SKU - Controlado por config/features.ts */}
                                       {FEATURES.ENABLE_PRODUCT_SKU && (
                                         <div className="text-[11px] text-muted-foreground font-mono">SKU: {producto.sku || 'N/A'}</div>
                                       )}
                                    </div>
                                 </div>
                              </TableCell>
                              <TableCell className="text-sm text-foreground/80 py-2">
                                 {producto.marca || 'Generico'} {producto.modelo ? `/ ${producto.modelo}` : ''}
                              </TableCell>
                              <TableCell className="py-2">
                                 <span className="px-2 py-0.5 inline-flex text-xs leading-4 font-medium rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                                    {producto.categoria?.nombre || 'Sin Cat.'}
                                 </span>
                              </TableCell>
                              <TableCell className="py-2 text-left">
                                 {producto.esServicio ? (
                                    <span className="text-xs text-muted-foreground italic">Servicio</span>
                                 ) : (
                                    <div className="flex items-center justify-left gap-2">
                                       <div className={cn("h-2 w-2 rounded-full", 
                                          producto.stockActual <= producto.stockMinimo ? "bg-destructive" : "bg-emerald-500"
                                       )}></div>
                                       <span className={cn("text-sm font-medium", 
                                          producto.stockActual <= producto.stockMinimo ? "text-destructive" : "text-foreground"
                                       )}>{producto.stockActual}</span>
                                    </div>
                                 )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground py-2">
                                 {producto.esServicio ? (
                                    <span className="text-xs italic">--</span>
                                 ) : (
                                    <div className="flex flex-col">
                                       <span className="font-medium text-foreground/80">{producto.ubicacion?.nombre || '-'}</span>
                                    </div>
                                 )}
                              </TableCell>
                              <TableCell className="text-right text-sm font-bold font-mono py-2">
                                 S/ {producto.precioVenta.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right py-2">
                                  <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleVerDetalle(producto)}>
                                         <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEdit(producto)}>
                                         <Pencil className="h-4 w-4" />
                                      </Button>
                                      {deleteConfirmId === producto.id ? (
                                        <div className="flex gap-1 items-center">
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                            className="h-8 px-2 text-xs"
                                            onClick={() => handleDelete(producto.id)}
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
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirmId(producto.id)}>
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
            </div>
            {/* Paginación */}
            <Pagination
              currentPage={currentPage}
              totalItems={total}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
         </div>
      </div>

      {/* Dialog de advertencia para eliminación con historial */}
      <Dialog 
        open={deleteWarningDialog.isOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setDeleteWarningDialog({ isOpen: false, productoId: null, mensaje: '' });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚠️ Confirmación Requerida</DialogTitle>
            <DialogDescription>
              {deleteWarningDialog.mensaje}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert variant="destructive">
              <AlertDescription>
                <strong>Nota:</strong> Esta acción ocultará el producto del sistema pero conservará el historial.
                Los reportes históricos mantendrán la información.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteWarningDialog({ isOpen: false, productoId: null, mensaje: '' })}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleForceDelete}
            >
              Confirmar Eliminación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
