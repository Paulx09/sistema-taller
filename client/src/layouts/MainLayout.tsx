import { useState, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ModeToggle } from '@/components/mode-toggle';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { BackupPanel } from '@/components/BackupPanel';
import { DatabaseBackup, ChevronUp, PanelLeft } from 'lucide-react';

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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [isHovered, setIsHovered] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const esAdmin = getRolFromToken() === 'ADMIN';

  // El menú se muestra extendido visualmente si NO está colapsado O si el usuario está haciendo hover
  const isExpanded = !isCollapsed || isHovered;

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      if (!next) {
        setIsHovered(false);
      }
      return next;
    });
  };

  const handleMouseEnter = () => {
    if (!isCollapsed) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 120);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      setBackupOpen(false);
    }, 180);
  };

  const handleLogout = () => {
    authService.removeToken();
    navigate('/login');
  };

  // Helper para verificar rutas activas y aplicar estilos
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center rounded-md font-medium text-sm transition-colors",
      !isExpanded
        ? "lg:justify-center lg:px-2 lg:py-2.5 px-3 py-2 gap-3"
        : "px-3 py-2 gap-3",
      isActive
        ? "bg-primary/10 text-primary font-semibold"
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
  };

  return (
    <div className="flex h-screen bg-muted/40 overflow-hidden font-sans text-slate-900 dark:text-slate-50 relative">
      {/* Placeholder en desktop cuando está colapsado para fijar el margen sin saltos de contenido */}
      {isCollapsed && <div className="hidden lg:block w-16 flex-shrink-0" />}

      {/* Sidebar */}
      <aside 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "bg-background border-r border-border flex flex-col flex-shrink-0 h-full transition-all duration-300 z-50",
          isCollapsed
            ? isHovered
              ? "w-64 lg:absolute lg:top-0 lg:left-0 lg:bottom-0 lg:shadow-2xl"
              : "w-64 lg:w-16 absolute lg:absolute top-0 left-0 bottom-0"
            : "w-64 absolute lg:static top-0 left-0 bottom-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header del sidebar */}
        <div className={cn(
          "h-14 flex items-center transition-all duration-300 border-b border-border/40",
          !isExpanded ? "lg:justify-center px-2" : "justify-between px-4"
        )}>
          <div 
            onClick={!isExpanded ? toggleCollapse : undefined}
            className={cn(
              "flex items-center gap-3 overflow-hidden",
              !isExpanded && "lg:cursor-pointer"
            )}
            title={!isExpanded ? "Clic para fijar menú abierto" : undefined}
          >
            <div className="h-9 w-9 shrink-0 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[20px]">storefront</span>
            </div>
            <div className={cn("flex flex-col min-w-0 transition-opacity duration-200", !isExpanded && "lg:hidden")}>
              <h1 className="text-sm font-bold leading-none tracking-tight truncate">Servicio Técnico</h1>
              <span className="text-muted-foreground text-xs mt-0.5 truncate">Panel de Control</span>
            </div>
          </div>

          {/* Botón para fijar / colapsar en desktop (solo visible si está expandido) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            className={cn(
              "hidden lg:flex h-8 w-8 text-muted-foreground hover:text-foreground shrink-0",
              !isExpanded && "lg:hidden"
            )}
            title={isCollapsed ? "Fijar menú lateral abierto" : "Colapsar menú lateral"}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>

        <nav className={cn(
          "flex-1 flex flex-col gap-1 overflow-y-auto overflow-x-hidden pt-2",
          !isExpanded ? "px-3 lg:px-2" : "px-3"
        )}>
          {/* General */}
          <NavLink 
            to="/" 
            className={navLinkClass} 
            end 
            title={!isExpanded ? "Dashboard" : undefined}
            onClick={() => {
              if (isCollapsed && isHovered) setIsHovered(false);
              setSidebarOpen(false);
            }}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0">dashboard</span>
            <span className={cn("truncate", !isExpanded && "lg:hidden")}>Dashboard</span>
          </NavLink>

          {/* Comercial */}
          <p className={cn("px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60", !isExpanded && "lg:hidden")}>
            Comercial
          </p>
          {!isExpanded && <div className="hidden lg:block my-2 border-t border-border/60 mx-1" />}
          <NavLink 
            to="/ventas" 
            className={navLinkClass} 
            title={!isExpanded ? "Ventas" : undefined}
            onClick={() => {
              if (isCollapsed && isHovered) setIsHovered(false);
              setSidebarOpen(false);
            }}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0">shopping_cart</span>
            <span className={cn("truncate", !isExpanded && "lg:hidden")}>Ventas</span>
          </NavLink>
          <NavLink 
            to="/compras" 
            className={navLinkClass} 
            title={!isExpanded ? "Compras" : undefined}
            onClick={() => {
              if (isCollapsed && isHovered) setIsHovered(false);
              setSidebarOpen(false);
            }}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0">shopping_bag</span>
            <span className={cn("truncate", !isExpanded && "lg:hidden")}>Compras</span>
          </NavLink>

          {/* Inventario */}
          <p className={cn("px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60", !isExpanded && "lg:hidden")}>
            Inventario
          </p>
          {!isExpanded && <div className="hidden lg:block my-2 border-t border-border/60 mx-1" />}
          <NavLink 
            to="/productos" 
            className={navLinkClass} 
            title={!isExpanded ? "Inventario" : undefined}
            onClick={() => {
              if (isCollapsed && isHovered) setIsHovered(false);
              setSidebarOpen(false);
            }}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0">inventory_2</span>
            <span className={cn("truncate", !isExpanded && "lg:hidden")}>Inventario</span>
          </NavLink>
          <NavLink 
            to="/proveedores" 
            className={navLinkClass} 
            title={!isExpanded ? "Proveedores" : undefined}
            onClick={() => {
              if (isCollapsed && isHovered) setIsHovered(false);
              setSidebarOpen(false);
            }}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0">local_shipping</span>
            <span className={cn("truncate", !isExpanded && "lg:hidden")}>Proveedores</span>
          </NavLink>

          {/* Servicio Técnico */}
          <p className={cn("px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60", !isExpanded && "lg:hidden")}>
            Servicio Técnico
          </p>
          {!isExpanded && <div className="hidden lg:block my-2 border-t border-border/60 mx-1" />}
          <NavLink 
            to="/ordenes-servicio" 
            className={navLinkClass} 
            title={!isExpanded ? "Órdenes Servicio" : undefined}
            onClick={() => {
              if (isCollapsed && isHovered) setIsHovered(false);
              setSidebarOpen(false);
            }}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0">build_circle</span>
            <span className={cn("truncate", !isExpanded && "lg:hidden")}>Órdenes Servicio</span>
          </NavLink>
          <NavLink 
            to="/clientes" 
            className={navLinkClass} 
            title={!isExpanded ? "Clientes" : undefined}
            onClick={() => {
              if (isCollapsed && isHovered) setIsHovered(false);
              setSidebarOpen(false);
            }}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0">person</span>
            <span className={cn("truncate", !isExpanded && "lg:hidden")}>Clientes</span>
          </NavLink>
          <NavLink 
            to="/verificar-garantia" 
            className={navLinkClass} 
            title={!isExpanded ? "Verificar Garantía" : undefined}
            onClick={() => {
              if (isCollapsed && isHovered) setIsHovered(false);
              setSidebarOpen(false);
            }}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0">verified</span>
            <span className={cn("truncate", !isExpanded && "lg:hidden")}>Verificar Garantía</span>
          </NavLink>
        </nav>

        <div className="border-t border-border mt-auto">

          {/* Copia de seguridad — solo ADMIN */}
          {esAdmin && (
            <>
              <div className={cn("pt-3", !isExpanded ? "px-3 lg:px-2" : "px-3")}>
                <button
                  onClick={() => {
                    if (isCollapsed) {
                      setIsCollapsed(false);
                      setIsHovered(false);
                      localStorage.setItem('sidebar_collapsed', 'false');
                      setBackupOpen(true);
                    } else {
                      setBackupOpen(prev => !prev);
                    }
                  }}
                  title={!isExpanded ? "Copia de seguridad" : undefined}
                  className={cn(
                    "flex w-full items-center rounded-md font-medium text-sm transition-colors",
                    !isExpanded
                      ? "lg:justify-center lg:px-2 lg:py-2.5 px-3 py-2 gap-3"
                      : "px-3 py-2 gap-3",
                    backupOpen
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <DatabaseBackup className="h-[20px] w-[20px] shrink-0" />
                  <span className={cn("flex-1 text-left truncate", !isExpanded && "lg:hidden")}>Copia de seguridad</span>
                  <ChevronUp
                    className={cn(
                      "h-4 w-4 transition-transform duration-200 shrink-0",
                      !backupOpen && "rotate-180",
                      !isExpanded && "lg:hidden"
                    )}
                  />
                </button>
              </div>

              {backupOpen && isExpanded && (
                <div className="px-3 pb-2 pt-1">
                  <BackupPanel />
                </div>
              )}
            </>
          )}

          {/* Cerrar sesión */}
          <div className={cn("p-4", !isExpanded ? "p-4 lg:p-2 lg:py-3" : "p-4")}>
            <Button
              onClick={handleLogout}
              variant="ghost"
              title={!isExpanded ? "Cerrar Sesión" : undefined}
              className={cn(
                "w-full text-muted-foreground hover:text-foreground",
                !isExpanded
                  ? "lg:justify-center lg:px-0 justify-start gap-2 px-3"
                  : "justify-start gap-2 px-3"
              )}
            >
              <span className="material-symbols-outlined text-[20px] shrink-0">logout</span>
              <span className={cn("truncate", !isExpanded && "lg:hidden")}>Cerrar Sesión</span>
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
          <div className="flex items-center gap-3">
            {/* Botón menú móvil */}
            <button 
                className="text-muted-foreground hover:text-foreground lg:hidden p-1 rounded-md"
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
