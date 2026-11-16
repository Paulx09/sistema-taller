import { useCallback, useEffect, useMemo, useState } from 'react';
import { listarLocales } from '@/services/local.service';
import { LocalContext, type LocalContextValue } from '@/contexts/local-context';
import type { Local } from '@/types';

const STORAGE_KEY = 'local_activo_id';
const DEFAULT_LOCAL_CODIGO = 'COPACABANA';

function pickDefaultLocal(locales: Local[], savedId: string | null): Local | null {
  if (locales.length === 0) return null;

  if (savedId) {
    const saved = locales.find((l) => l.id === savedId && l.activo !== false);
    if (saved) return saved;
  }

  return (
    locales.find((l) => l.codigo === DEFAULT_LOCAL_CODIGO && l.activo !== false) ??
    locales.find((l) => l.activo !== false) ??
    locales[0]
  );
}

export function LocalProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [locales, setLocales] = useState<Local[]>([]);
  const [localActivoId, setLocalActivoIdState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || '';
  });
  const [loadingLocales, setLoadingLocales] = useState(true);
  const [errorLocales, setErrorLocales] = useState<string | null>(null);

  const recargarLocales = useCallback(async () => {
    setLoadingLocales(true);
    setErrorLocales(null);
    try {
      const data = await listarLocales();
      const activos = data.filter((l) => l.activo !== false);
      setLocales(activos);

      const savedId = localStorage.getItem(STORAGE_KEY);
      const elegido = pickDefaultLocal(activos, savedId);
      if (elegido) {
        setLocalActivoIdState(elegido.id);
        localStorage.setItem(STORAGE_KEY, elegido.id);
      } else {
        setLocalActivoIdState('');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data
          ?.error ||
        (err as { message?: string })?.message ||
        'No se pudieron cargar los locales';
      setErrorLocales(msg);
      console.error('Error al cargar locales:', msg);
    } finally {
      setLoadingLocales(false);
    }
  }, []);

  useEffect(() => {
    recargarLocales();
  }, [recargarLocales]);

  const setLocalActivoId = useCallback((id: string) => {
    setLocalActivoIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const localActivo = useMemo(
    () => locales.find((l) => l.id === localActivoId) ?? null,
    [locales, localActivoId]
  );

  const value = useMemo<LocalContextValue>(
    () => ({
      locales,
      localActivoId,
      localActivo,
      setLocalActivoId,
      loadingLocales,
      errorLocales,
      recargarLocales,
    }),
    [locales, localActivoId, localActivo, setLocalActivoId, loadingLocales, errorLocales, recargarLocales]
  );

  return <LocalContext.Provider value={value}>{children}</LocalContext.Provider>;
}
