import { useState } from 'react';
import { useProductos } from '@/hooks/useProductos';
import { useCategorias } from '@/hooks/useCategorias';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { SeriesDetalleModal } from '@/components/SeriesDetalleModal';
import { Plus, Pencil, Trash2, Loader2, Eye, Search, AlertCircle, Wrench, Package, QrCode } from 'lucide-react';
import { ProductoForm } from '@/components/forms/ProductoForm';
import { ProductoDetalle } from '@/components/ProductoDetalle';
import type { Producto, TipoItem } from '@/types';
import { cn } from '@/lib/utils';

export function ProductosPage() {
  const [busqueda, setBusqueda] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'all' | TipoItem>('all');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Calcular skip para la paginación
  const skip = (currentPage - 1) * itemsPerPage;

  const { productos, total, loading, error, createProducto, updateProducto, deleteProducto, refetch } =
    useProductos({
      busqueda: busqueda || undefined,
      tipo: tipoFilter === 'all' ? undefined : tipoFilter,
      categoriaId: categoriaFilter === 'all' ? undefined : categoriaFilter,
      skip,
      take: itemsPerPage,
    });

  // Categorías completas y filtradas según el tipo seleccionado
  const { categorias, refetch: refetchCategorias } = useCategorias();
  const categoriasFiltradas = tipoFilter === 'all' 
    ? categorias 
    : categorias.filter((c) => !c.tipo || c.tipo === tipoFilter);

  const handleTipoChange = (value: 'all' | TipoItem) => {
    setTipoFilter(value);
    setCategoriaFilter('all');
    setCurrentPage(1);
  };

  const handleCategoriaChange = (value: string) => {
    setCategoriaFilter(value);
    setCurrentPage(1);
  };

  const handleBusquedaChange = (value: string) => {
    setBusqueda(value);
    setCurrentPage(1);
  };

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [viewingProducto, setViewingProducto] = useState<Producto | null>(null);
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

  // Estado para modal de series
  const [seriesModalOpen, setSeriesModalOpen] = useState(false);
  const [productoSeriesId, setProductoSeriesId] = useState<string | null>(null);
  const [productoSeriesNombre, setProductoSeriesNombre] = useState<string>('');

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

  const handleVerSeries = (productoId: string, productoNombre: string) => {
    setProductoSeriesId(productoId);
    setProductoSeriesNombre(productoNombre);
    setSeriesModalOpen(true);
  };

  const handleDelete = async (id: string, force: boolean = false) => {
    try {
      await deleteProducto(id, force);
      setDeleteConfirmId(null);
      setDeleteWarningDialog({ isOpen: false, productoId: null, mensaje: '' });
      refetch();
    } catch (err: any) {
      if (err.requiresConfirmation || err.response?.data?.requiereConfirmacion) {
        setDeleteWarningDialog({
          isOpen: true,
          productoId: id,
          mensaje: err.response?.data?.mensaje || 'Este ítem tiene ventas asociadas. ¿Deseas archivarlo de todas formas?',
        });
        setDeleteConfirmId(null);
      } else {
        console.error('Error al eliminar producto:', err);
      }
    }
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
    setEditingProducto(null);
    setViewingProducto(null);
  };

  const formatPrecio = (precio: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(precio);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Inventario y Catálogo
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gestión centralizada de Productos y Servicios
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleCreate} className="shadow-sm">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Registro
          </Button>
        </div>
      </div>

      {/* Barra de Filtros (Orden: Tipo -> Categoría -> Búsqueda) */}
      <div className="bg-card p-3.5 rounded-lg border shadow-sm flex flex-col md:flex-row gap-3 items-center">
        {/* 1° Filtro: TIPO */}
        <div className="w-full md:w-48 shrink-0">
          <Select
            value={tipoFilter}
            onValueChange={handleTipoChange}
          >
            <SelectTrigger className="bg-background h-9">
              <SelectValue placeholder="Tipo..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">TODOS LOS TIPOS</SelectItem>
              <SelectItem value="PRODUCTO">📦 PRODUCTOS</SelectItem>
              <SelectItem value="SERVICIO">🔧 SERVICIOS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 2° Filtro: CATEGORÍA (Dependiente del Tipo) */}
        <div className="w-full md:w-56 shrink-0">
          <Select value={categoriaFilter} onValueChange={handleCategoriaChange}>
            <SelectTrigger className="bg-background h-9">
              <SelectValue placeholder="Categoría..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">TODAS LAS CATEGORÍAS</SelectItem>
              {categoriasFiltradas.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 3° Filtro: Búsqueda por texto */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por detalle, modelo o código..."
            value={busqueda}
            onChange={(e) => handleBusquedaChange(e.target.value)}
            className="pl-9 bg-background h-9"
          />
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabla de Productos / Servicios */}
      <div className="bg-card border rounded-lg shadow-sm overflow-hidden flex flex-col">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10 w-full">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-bold uppercase tracking-wider h-10 pl-4">
                DETALLE
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider h-10 w-28 text-center">
                TIPO
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider h-10 w-28 text-center">
                STOCK
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider h-10 w-32 text-right pr-4">
                PRECIO
              </TableHead>
              <TableHead className="text-right text-xs font-bold uppercase tracking-wider h-10 pr-4 w-32">
                ACCIONES
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y">
            {loading && productos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Cargando catálogo...
                </TableCell>
              </TableRow>
            ) : productos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  No se encontraron registros
                </TableCell>
              </TableRow>
            ) : (
              productos.map((prod) => {
                const isServ = prod.tipo === 'SERVICIO' || prod.esServicio;
                const stockBajo = !isServ && prod.stockActual <= prod.stockMinimo;

                return (
                  <TableRow key={prod.id} className="hover:bg-muted/50 transition-colors group">
                    {/* Columna DETALLE */}
                    <TableCell className="py-2.5 pl-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-foreground uppercase tracking-wide">
                          {prod.nombre}
                        </span>
                        {prod.descripcion && (
                          <span className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {prod.descripcion}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Columna TIPO */}
                    <TableCell className="py-2.5 text-center">
                      {isServ ? (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-semibold text-[11px] gap-1 px-2 py-0.5">
                          <Wrench className="h-3 w-3" />
                          SERVICIO
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:text-blue-300 font-semibold text-[11px] gap-1 px-2 py-0.5">
                          <Package className="h-3 w-3" />
                          PRODUCTO
                        </Badge>
                      )}
                    </TableCell>

                    {/* Columna STOCK */}
                    <TableCell className="py-2.5 text-center">
                      {isServ ? (
                        <span className="text-xs text-muted-foreground font-medium italic">
                          Servicio
                        </span>
                      ) : (
                        <Badge
                          variant={stockBajo ? 'destructive' : 'secondary'}
                          className={cn(
                            'font-mono text-xs px-2.5 py-0.5',
                            stockBajo ? 'bg-destructive/15 text-destructive font-bold border-destructive/30' : ''
                          )}
                        >
                          {prod.stockActual}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Columna PRECIO */}
                    <TableCell className="py-2.5 text-right pr-4 font-semibold text-sm text-foreground">
                      {formatPrecio(prod.precioVenta)}
                    </TableCell>

                    {/* Columna ACCIONES */}
                    <TableCell className="py-2.5 pr-4 text-right">
                      <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => handleVerDetalle(prod)}
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {prod.requiereSerie && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleVerSeries(prod.id, prod.nombre)}
                            title="Ver Series"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => handleEdit(prod)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {deleteConfirmId === prod.id ? (
                          <div className="flex gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8 text-xs px-2"
                              onClick={() => handleDelete(prod.id)}
                            >
                              Confirmar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs px-2"
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
                            onClick={() => setDeleteConfirmId(prod.id)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
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

      {/* Sheet para Crear / Editar / Ver Detalle */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {viewingProducto
                ? viewingProducto.nombre
                : editingProducto
                ? 'Editar Registro'
                : 'Nuevo Registro'}
            </SheetTitle>
            <SheetDescription>
              {viewingProducto
                ? 'Detalles técnicos y movimientos del registro'
                : editingProducto
                ? 'Modifica los campos del registro'
                : 'Registra un nuevo producto físico o servicio en el catálogo'}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4">
            {viewingProducto ? (
              <ProductoDetalle producto={viewingProducto} onRefresh={refetch} />
            ) : (
              <ProductoForm
                producto={editingProducto}
                onSuccess={() => {
                  handleCloseSheet();
                  refetch();
                  refetchCategorias();
                }}
                onCreate={createProducto}
                onUpdate={updateProducto}
                categorias={categorias}
                onCategoriaCreada={() => refetchCategorias()}
                onCategoriaActualizada={() => refetchCategorias()}
                onCategoriaEliminada={() => refetchCategorias()}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Diálogo de advertencia para eliminar */}
      <Dialog
        open={deleteWarningDialog.isOpen}
        onOpenChange={(open) =>
          !open && setDeleteWarningDialog({ isOpen: false, productoId: null, mensaje: '' })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              ¿Archivar registro con historial?
            </DialogTitle>
            <DialogDescription className="py-2 text-sm text-muted-foreground">
              {deleteWarningDialog.mensaje}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteWarningDialog({ isOpen: false, productoId: null, mensaje: '' })}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteWarningDialog.productoId) {
                  handleDelete(deleteWarningDialog.productoId, true);
                }
              }}
            >
              Sí, archivar registro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Series */}
      {seriesModalOpen && (
        <SeriesDetalleModal
          isOpen={seriesModalOpen}
          onClose={() => setSeriesModalOpen(false)}
          productoId={productoSeriesId || ''}
          productoNombre={productoSeriesNombre}
        />
      )}
    </div>
  );
}
