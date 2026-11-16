import { useContext } from 'react';
import { LocalContext, type LocalContextValue } from '@/contexts/local-context';

export function useLocal(): LocalContextValue {
  const ctx = useContext(LocalContext);
  if (!ctx) {
    throw new Error('useLocal debe utilizarse dentro de un LocalProvider');
  }
  return ctx;
}
