import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { Dashboard } from '@/pages/Dashboard';
import { UbicacionesPage } from '@/pages/UbicacionesPage';
import { CategoriasPage } from '@/pages/CategoriasPage';
import { ProductosPage } from '@/pages/ProductosPage';
import { ThemeProvider } from "@/components/theme-provider"
import './App.css';

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="ubicaciones" element={<UbicacionesPage />} />
            <Route path="categorias" element={<CategoriasPage />} />
            <Route path="productos" element={<ProductosPage />} />
            {/* TODO: Agregar ruta para Ventas */}
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
