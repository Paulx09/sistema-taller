import { createContext } from 'react';
import type { Local } from '@/types';

export interface LocalContextValue {
  locales: Local[];
  localActivoId: string;
  localActivo: Local | null;
  setLocalActivoId: (id: string) => void;
  loadingLocales: boolean;
  errorLocales: string | null;
  recargarLocales: () => Promise<void>;
}

export const LocalContext = createContext<LocalContextValue | undefined>(undefined);
