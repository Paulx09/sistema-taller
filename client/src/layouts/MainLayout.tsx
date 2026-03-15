import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ModeToggle } from '@/components/mode-toggle';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { BackupPanel } from '@/components/BackupPanel';
import { DatabaseBackup, ChevronUp } from 'lucide-react';

function getRolFromToken(): string | null {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split('.')[1])).rol ?? null;
  } catch {
    return null;
  }
}

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const esAdmin = getRolFromToken() === 'ADMIN';

  const handleLogout = () => {
    authService.removeToken();
    navigate('/login');
  };

  // Helper para verificar rutas activas y aplicar estilos
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 px-3 py-2 text-sm rounded-md font-medium transition-colors",
      isActive
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );

  const getPageTitle = () => {
      if (location.pathname === '/') return 'Resumen Diario';
      if (location.pathname.startsWith('/productos')) return 'Gestión de Inventario';
      if (location.pathname.startsWith('/categorias')) return 'Gestión de Categorías';
      if (location.pathname.startsWith('/ventas')) return 'Punto de Venta';
      if (location.pathname.startsWith('/ubicaciones')) return 'Gestión de Ubicaciones';
      if (location.pathname.startsWith('/proveedores')) return 'Gestión de Proveedores';
      if (location.pathname.startsWith('/compras')) return 'Compras e Inventario';
      if (location.pathname.startsWith('/verificar-garantia')) return 'Verificar Garantía';
      if (location.pathname.startsWith('/clientes')) return 'Gestión de Clientes';
      if (location.pathname.match(/^\/ordenes-servicio\/[^/]+$/)) return 'Detalle de Orden';
      if (location.pathname.startsWith('/ordenes-servicio')) return 'Órdenes de Servicio';
      return 'Sistema Taller';
  }

  return (
    <div className="flex h-screen bg-muted/40 overflow-hidden font-sans text-slate-900 dark:text-slate-50">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-background border-r border-border flex flex-col flex-shrink-0 h-full transition-all duration-300 w-64 absolute lg:static z-50",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[20px]">storefront</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold leading-none tracking-tight">Servicio Técnico</h1>
            <span className="text-muted-foreground text-xs mt-0.5">Panel de Control</span>
          </div>
        </div>

        <nav className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto pt-2">
          {/* General */}
          <NavLink to="/" className={navLinkClass} end>
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            Dashboard
          </NavLink>

          {/* Comercial */}
          <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Comercial</p>
          <NavLink to="/ventas" className={navLinkClass}>
            <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
            Ventas
          </NavLink>
          <NavLink to="/compras" className={navLinkClass}>
            <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
            Compras
          </NavLink>

          {/* Inventario */}
          <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Inventario</p>
          <NavLink to="/productos" className={navLinkClass}>
            <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            Inventario
          </NavLink>
          <NavLink to="/proveedores" className={navLinkClass}>
            <span className="material-symbols-outlined text-[20px]">local_shipping</span>
            Proveedores
          </NavLink>
          <NavLink to="/categorias" className={navLinkClass}>
            <span className="material-symbols-outlined text-[20px]">category</span>
            Categorías
          </NavLink>
          <NavLink to="/ubicaciones" className={navLinkClass}>
            <span className="material-symbols-outlined text-[20px]">shelves</span>
            Ubicaciones
          </NavLink>

          {/* Servicio Técnico */}
          <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Servicio Técnico</p>
          <NavLink to="/ordenes-servicio" className={navLinkClass}>
            <span className="material-symbols-outlined text-[20px]">build_circle</span>
            Órdenes Servicio
          </NavLink>
          <NavLink to="/clientes" className={navLinkClass}>
            <span className="material-symbols-outlined text-[20px]">person</span>
            Clientes
          </NavLink>
          <NavLink to="/verificar-garantia" className={navLinkClass}>
            <span className="material-symbols-outlined text-[20px]">verified</span>
            Verificar Garantía
          </NavLink>
        </nav>

        <div className="border-t border-border mt-auto">

          {/* Copia de seguridad — solo ADMIN */}
          {esAdmin && (
            <>
              <div className="px-3 pt-3">
                <button
                  onClick={() => setBackupOpen(prev => !prev)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-sm rounded-md font-medium transition-colors",
                    backupOpen
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <DatabaseBackup className="h-[20px] w-[20px] shrink-0" />
                  <span className="flex-1 text-left">Copia de seguridad</span>
                  <ChevronUp
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      !backupOpen && "rotate-180"
                    )}
                  />
                </button>
              </div>

              {backupOpen && (
                <div className="px-3 pb-2 pt-1">
                  <BackupPanel />
                </div>
              )}
            </>
          )}

          {/* Cerrar sesión */}
          <div className="p-4">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start gap-2 px-3 text-muted-foreground hover:text-foreground"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span>Cerrar Sesión</span>
            </Button>
          </div>

        </div>
      </aside>

      {/* Overlay para móvil */}
      {sidebarOpen && (
        <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-14 bg-background border-b border-border flex items-center justify-between px-6 flex-shrink-0 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button 
                className="text-muted-foreground hover:text-foreground lg:hidden"
                onClick={() => setSidebarOpen(true)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="hidden sm:flex items-center text-sm text-muted-foreground">
              <span className="hover:text-primary cursor-pointer transition-colors flex items-center gap-1" onClick={() => navigate(-1)}>
                Atrás
              </span>
              <span className="material-symbols-outlined text-[16px] mx-2 text-slate-400">chevron_right</span>
              <span className="text-foreground font-medium">{getPageTitle()}</span>
            </div>
          </div>

          <ModeToggle />
        </header>

        <div className={cn(
          "flex-1",
          location.pathname.startsWith('/ventas')
            ? "overflow-hidden"
            : "overflow-y-auto p-6 md:p-8 custom-scrollbar"
        )}>
           <Outlet />
        </div>
      </main>
    </div>
  );
}
