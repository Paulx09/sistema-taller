import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { Dashboard } from '@/pages/Dashboard';
import { UbicacionesPage } from '@/pages/UbicacionesPage';
import { CategoriasPage } from '@/pages/CategoriasPage';
import { ProductosPage } from '@/pages/ProductosPage';
import { VentasPage } from '@/pages/VentasPage';
import { LoginPage } from '@/pages/LoginPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ThemeProvider } from "@/components/theme-provider"
import './App.css';

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <BrowserRouter>
        <Routes>
          {/* Ruta pública de login */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Rutas protegidas */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="ubicaciones" element={<UbicacionesPage />} />
            <Route path="categorias" element={<CategoriasPage />} />
            <Route path="productos" element={<ProductosPage />} />
            <Route path="ventas" element={<VentasPage />} />
          </Route>

          {/* Ruta por defecto - redirige al dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
