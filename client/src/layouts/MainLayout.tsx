import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ModeToggle } from '@/components/mode-toggle';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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
          <NavLink to="/" className={navLinkClass} end>
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            Dashboard
          </NavLink>
          <NavLink to="/productos" className={navLinkClass}>
            <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            Inventario
          </NavLink>
          <NavLink to="/categorias" className={navLinkClass}>
            <span className="material-symbols-outlined text-[20px]">category</span>
            Categorías
          </NavLink>
          <NavLink to="/ventas" className={navLinkClass}>
            <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
            Ventas
          </NavLink>
          <NavLink to="/ubicaciones" className={navLinkClass}>
             <span className="material-symbols-outlined text-[20px]">shelves</span>
             Ubicaciones
          </NavLink>
          <NavLink to="/reportes" className={navLinkClass}>
            <span className="material-symbols-outlined text-[20px]">bar_chart</span>
            Reportes
          </NavLink>
        </nav>

        <div className="p-4 border-t border-border mt-auto">
          <NavLink to="/configuracion" className={navLinkClass}>
            <span className="material-symbols-outlined text-[20px]">settings</span>
            Configuración
          </NavLink>
          <div className="mt-2">
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
              <span className="hover:text-primary cursor-pointer transition-colors">Inicio</span>
              <span className="material-symbols-outlined text-[16px] mx-2 text-slate-400">chevron_right</span>
              <span className="text-foreground font-medium">{getPageTitle()}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block w-64">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground material-symbols-outlined text-[18px]">search</span>
              <input 
                className="w-full h-9 pl-9 pr-4 rounded-md bg-muted/50 border border-transparent focus:bg-white focus:border-primary focus:ring-0 text-sm transition-all placeholder:text-muted-foreground outline-none" 
                placeholder="Buscar..." 
                type="text"
              />
            </div>
            <div className="flex items-center gap-2">
              <ModeToggle />
              <button className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground transition-colors relative">
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-destructive border-2 border-white"></span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
           <Outlet />
        </div>
      </main>
    </div>
  );
}
