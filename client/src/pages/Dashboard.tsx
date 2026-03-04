import { useState } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Pagination } from '@/components/Pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AjustarStockDialog } from '@/components/AjustarStockDialog';
import type { Producto } from '@/types';
import type { ProductoBajoStock } from '@/services/dashboard.service';

export function Dashboard() {
  const { 
    metrics, 
    bajoStock, 
    sinMovimiento, 
    loading, 
    diasSinMovimiento, 
    setDiasSinMovimiento,
    refetch,
  } = useDashboard();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Paginación para Stock Crítico
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = bajoStock.slice(indexOfFirstItem, indexOfLastItem);

  const handleAjustarStock = (producto: ProductoBajoStock) => {
    setProductoSeleccionado(producto as Producto);
    setDialogOpen(true);
  };

  const handleStockSuccess = () => {
    setDialogOpen(false);
    setProductoSeleccionado(null);
    refetch();
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Fecha actual formateada
  const fechaHoy = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Resumen del Negocio</h2>
          <p className="text-muted-foreground mt-1 text-sm">Métricas de rendimiento en tiempo real.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-md border border-border text-sm font-medium text-foreground shadow-sm">
          <span className="material-symbols-outlined text-[16px] text-muted-foreground">calendar_today</span>
          <span>{fechaHoy}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Ventas */}
        <Link to="/ventas" className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-medium text-muted-foreground">Ventas de Hoy</p>
            <span className="material-symbols-outlined text-muted-foreground text-[20px]">payments</span>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-2xl font-bold text-foreground">{metrics.ventasHoy}</h3>
            <div className="flex items-center text-xs text-muted-foreground">
               <span className="text-success font-medium flex items-center mr-1">
                 <span className="material-symbols-outlined text-[14px]">trending_up</span>
                 {' '}+0%
               </span>
               {' '}vs. ayer
            </div>
          </div>
        </Link>

        {/* Card 2: Ganancia Real */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
           <div className="absolute right-0 top-0 h-24 w-24 bg-gradient-to-br from-primary/5 to-primary/10 rounded-bl-[100px] -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
           <div className="flex justify-between items-start mb-4 relative z-10">
            <p className="text-sm font-medium text-muted-foreground">Ganancia Real Hoy</p>
            <span className="material-symbols-outlined text-primary text-[20px]">account_balance_wallet</span>
          </div>
          <div className="flex flex-col gap-1 relative z-10">
            <h3 className="text-2xl font-bold text-foreground">S/ {metrics.gananciaHoy.toFixed(2)}</h3>
             <div className="flex items-center text-xs text-muted-foreground">
               <span className="text-success font-medium flex items-center mr-1">
                 <span className="material-symbols-outlined text-[14px]">trending_up</span>
                 {' '}+0%
               </span>
               {' '}margen neto
            </div>
          </div>
        </div>

        {/* Card 3: Órdenes de Servicio Activas */}
        <Link to="/ordenes-servicio" className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow block group">
           <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-medium text-muted-foreground">Reparaciones Activas</p>
            <span className="material-symbols-outlined text-muted-foreground text-[20px] group-hover:text-primary transition-colors">build_circle</span>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-2xl font-bold text-foreground">{metrics.ordenesActivas}</h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
               <span className="text-blue-500 font-medium">{metrics.ordenesDetalle.recibidas} recibidas</span>
               <span>·</span>
               <span className="text-yellow-600 font-medium">{metrics.ordenesDetalle.enReparacion} en proceso</span>
               <span>·</span>
               <span className="text-green-600 font-medium">{metrics.ordenesDetalle.listas} listas</span>
            </div>
          </div>
        </Link>

        {/* Card 4: Alertas Stock */}
        <Link to="/productos" className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
           <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-medium text-muted-foreground">Alertas de Stock</p>
            <span className="material-symbols-outlined text-muted-foreground text-[20px]">inventory</span>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-2xl font-bold text-foreground">{metrics.productosStockBajo}</h3>
            <div className="flex items-center text-xs text-muted-foreground">
               <span className="text-destructive font-medium flex items-center mr-1">
                 <span className="material-symbols-outlined text-[14px]">warning</span>
                 {' '}Crítico
               </span>
               {' '}reponer pronto
            </div>
          </div>
        </Link>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6 w-full">
        
        {/* Tabla Stock Crítico */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl shadow-sm flex flex-col overflow-hidden">
           <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-card sticky top-0 z-10">
             <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground text-lg">Stock Crítico</h3>
                <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-0.5 rounded-full border border-destructive/20">Bajo Stock</span>
             </div>
             <Link to="/productos" className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors">
                Ver Productos <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
             </Link>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead>
                 <tr className="bg-muted/40 border-b border-border">
                    <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Producto</th>
                    <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Marca/Modelo</th>
                    <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Cant.</th>
                    <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ubicación</th>
                    <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Acción</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-border">
                 {currentItems.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground text-sm">
                            Todo en orden. No hay productos con stock bajo.
                        </td>
                    </tr>
                 ) : (
                    currentItems.map((prod) => (
                        <tr key={prod.id} className="group hover:bg-muted/50 transition-colors">
                           <td className="px-6 py-4">
                             <div className="flex items-center gap-3">
                               <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center text-muted-foreground border border-border">
                                  <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                               </div>
                               <span className="font-medium text-sm text-foreground">{prod.nombre}</span>
                             </div>
                           </td>
                           <td className="px-6 py-4 text-sm text-muted-foreground">
                             {prod.marca && prod.modelo 
                               ? `${prod.marca} ${prod.modelo}`
                               : prod.marca || prod.modelo || '-'}
                           </td>
                           <td className="px-6 py-4 text-center">
                              <span className={cn(
                                "inline-flex items-center justify-center h-6 px-2 rounded-md text-xs font-bold border",
                                prod.stockActual === 0 
                                    ? "bg-destructive/10 text-destructive border-destructive/20"
                                    : "bg-warning/10 text-warning-700 border-warning/20 text-orange-700"
                              )}>
                                {prod.stockActual}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-sm text-muted-foreground">
                             <div className="flex items-center gap-1.5">
                               <span className="material-symbols-outlined text-[16px] text-muted-foreground">shelves</span>
                               <span>{prod.ubicacion?.nombre || 'Sin ubicación'}</span>
                             </div>
                           </td>
                           <td className="px-6 py-4 text-right">
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={() => handleAjustarStock(prod)}
                               className="opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                               <span className="material-symbols-outlined text-[16px] mr-1">add</span>
                               {' '}Stock
                             </Button>
                           </td>
                        </tr>
                    ))
                 )}
               </tbody>
             </table>
           </div>
           
           {bajoStock.length > itemsPerPage && (
             <div className="px-6 py-4 border-t border-border bg-muted/20">
               <Pagination
                 currentPage={currentPage}
                 totalItems={bajoStock.length}
                 itemsPerPage={itemsPerPage}
                 onPageChange={setCurrentPage}
                 onItemsPerPageChange={setItemsPerPage}
               />
             </div>
           )}
        </div>

        {/* Lista Productos Estancados */}
        <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col h-full">
           <div className="px-6 py-4 border-b border-border bg-card sticky top-0 z-10">
             <div className="flex justify-between items-start mb-3">
               <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
                 <span className="material-symbols-outlined text-warning">history</span>
                 {' '}Productos Estancados
               </h3>
             </div>
             <div className="flex items-center gap-2">
               <span className="text-xs text-muted-foreground">Sin movimiento hace:</span>
               <Select
                 value={diasSinMovimiento.toString()}
                 onValueChange={(value) => setDiasSinMovimiento(Number(value))}
               >
                 <SelectTrigger className="w-[130px] h-8 text-xs">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="30">30 días</SelectItem>
                   <SelectItem value="60">60 días</SelectItem>
                   <SelectItem value="90">90 días</SelectItem>
                   <SelectItem value="120">120 días</SelectItem>
                   <SelectItem value="180">180 días</SelectItem>
                 </SelectContent>
               </Select>
             </div>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 custom-scrollbar max-h-[400px]">
             {sinMovimiento.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                    No hay productos estancados. ¡Buena rotación!
                </div>
             ) : (
                <div className="flex flex-col gap-3">
                    {sinMovimiento.slice(0, 10).map((prod) => (
                        <div key={prod.id} className="flex items-start p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border cursor-pointer group">
                             <div className="h-10 w-10 rounded-md bg-muted flex-shrink-0 flex items-center justify-center text-muted-foreground border border-border group-hover:bg-background group-hover:border-border">
                                <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                             </div>
                             <div className="ml-3 flex-1 min-w-0">
                               <div className="flex justify-between items-start">
                                 <p className="text-sm font-medium text-foreground truncate">{prod.nombre}</p>
                                 <span className="inline-block px-1.5 py-0.5 bg-warning/10 text-warning-700 text-[10px] font-bold rounded text-amber-700">
                                    {prod.diasSinMovimiento}d
                                 </span>
                               </div>
                               <div className="flex items-center gap-2 mt-0.5">
                                 {prod.categoria && (
                                   <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                                     {prod.categoria.nombre}
                                   </span>
                                 )}
                                 <span className="text-xs text-muted-foreground">
                                   Stock: {prod.stockActual}
                                 </span>
                               </div>
                             </div>
                        </div>
                    ))}
                </div>
             )}
             
           </div>
        </div>

      </div>

      {/* Dialog para ajustar stock */}
      {productoSeleccionado && (
        <AjustarStockDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          producto={productoSeleccionado}
          onSuccess={handleStockSuccess}
        />
      )}
    </div>
  );
}
