import { useDashboard } from '@/hooks/useDashboard';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const { metrics, bajoStock, sinMovimiento, loading } = useDashboard();

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
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-medium text-muted-foreground">Ventas de Hoy</p>
            <span className="material-symbols-outlined text-muted-foreground text-[20px]">payments</span>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-2xl font-bold text-foreground">S/ {metrics.ventasHoy.toFixed(2)}</h3>
            <div className="flex items-center text-xs text-muted-foreground">
               <span className="text-success font-medium flex items-center mr-1">
                 <span className="material-symbols-outlined text-[14px]">trending_up</span>
                 +0%
               </span>
               vs. ayer
            </div>
          </div>
        </div>

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
                 +0%
               </span>
               margen neto
            </div>
          </div>
        </div>

        {/* Card 3: Reparaciones (Mock por ahora) */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
           <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-medium text-muted-foreground">Reparaciones Pendientes</p>
            <span className="material-symbols-outlined text-muted-foreground text-[20px]">build_circle</span>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-2xl font-bold text-foreground">0</h3>
            <div className="flex items-center text-xs text-muted-foreground">
               <span className="text-warning font-medium flex items-center mr-1">
                 <span className="material-symbols-outlined text-[14px]">schedule</span>
                 0 urgentes
               </span>
               en cola
            </div>
          </div>
        </div>

        {/* Card 4: Alertas Stock */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
           <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-medium text-muted-foreground">Alertas de Stock</p>
            <span className="material-symbols-outlined text-muted-foreground text-[20px]">inventory</span>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-2xl font-bold text-foreground">{metrics.productosStockBajo}</h3>
            <div className="flex items-center text-xs text-muted-foreground">
               <span className="text-destructive font-medium flex items-center mr-1">
                 <span className="material-symbols-outlined text-[14px]">warning</span>
                 Crítico
               </span>
               reponer pronto
            </div>
          </div>
        </div>
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
                Ver Todo <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
             </Link>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead>
                 <tr className="bg-muted/40 border-b border-border">
                    <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Producto</th>
                    <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">SKU</th>
                     <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Cant.</th>
                    <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ubicación</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-border">
                 {Array.isArray(bajoStock) && bajoStock.length === 0 ? (
                    <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground text-sm">
                            Todo en orden. No hay productos con stock bajo.
                        </td>
                    </tr>
                 ) : (
                    Array.isArray(bajoStock) && bajoStock.slice(0, 5).map((prod) => (
                        <tr key={prod.id} className="group hover:bg-muted/50 transition-colors">
                           <td className="px-6 py-4">
                             <div className="flex items-center gap-3">
                               <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center text-muted-foreground border border-border">
                                  <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                               </div>
                               <span className="font-medium text-sm text-foreground">{prod.nombre}</span>
                             </div>
                           </td>
                           <td className="px-6 py-4 text-xs text-muted-foreground font-mono">{prod.sku || '-'}</td>
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
                        </tr>
                    ))
                 )}
               </tbody>
             </table>
           </div>
        </div>

        {/* Lista Productos Estancados */}
        <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col h-full">
           <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-card sticky top-0 z-10">
             <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
               <span className="material-symbols-outlined text-warning">history</span>
               Productos Estancados
             </h3>
             <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-full border border-border">
                &gt; 90 Días
             </span>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 custom-scrollbar max-h-[400px]">
             {sinMovimiento.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                    No hay productos estancados. ¡Buena rotación!
                </div>
             ) : (
                <div className="flex flex-col gap-3">
                    {sinMovimiento.slice(0, 5).map((prod) => (
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
                               <p className="text-xs text-muted-foreground mt-0.5">Sin movimientos recientes</p>
                             </div>
                        </div>
                    ))}
                </div>
             )}
             
             {sinMovimiento.length > 0 && (
                 <button className="w-full mt-2 py-2 text-sm font-medium text-muted-foreground border border-dashed border-border rounded-md hover:bg-muted hover:text-foreground transition-colors">
                    Ver Reporte Completo
                 </button>
             )}
           </div>
        </div>

      </div>
    </div>
  );
}
