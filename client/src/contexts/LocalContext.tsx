import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listarLocales } from '@/services/local.service';
import { LocalContext, type LocalContextValue } from '@/contexts/local-context';
import { queryKeys } from '@/lib/queryClient';
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
  const [selectedLocalId, setSelectedLocalId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || '';
  });

  const {
    data,
    isPending,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.locales,
    queryFn: listarLocales,
    staleTime: 5 * 60_000,
  });

  const locales = useMemo(
    () => (data ? data.filter((l) => l.activo !== false) : []),
    [data]
  );

  const localActivo = useMemo(
    () => (data ? pickDefaultLocal(locales, selectedLocalId || null) : null),
    [data, locales, selectedLocalId]
  );

  const localActivoId = data ? (localActivo?.id ?? '') : selectedLocalId;

  useEffect(() => {
    if (!data || !localActivo) return;
    localStorage.setItem(STORAGE_KEY, localActivo.id);
  }, [data, localActivo]);

  const errorLocales = useMemo(() => {
    if (!queryError) return null;
    const err = queryError as { response?: { data?: { error?: string } }; message?: string };
    return (
      err?.response?.data?.error ||
      err?.message ||
      'No se pudieron cargar los locales'
    );
  }, [queryError]);

  useEffect(() => {
    if (errorLocales) {
      console.error('Error al cargar locales:', errorLocales);
    }
  }, [errorLocales]);

  const recargarLocales = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const setLocalActivoId = useCallback((id: string) => {
    setSelectedLocalId(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const loadingLocales = isPending || isFetching;

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
