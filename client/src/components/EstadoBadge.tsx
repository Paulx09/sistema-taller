import type { EstadoOrden } from '@/types';
import { cn } from '@/lib/utils';

const ESTADO_CONFIG: Record<EstadoOrden, { label: string; className: string }> = {
  RECIBIDA: {
    label: 'Recibida',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  EN_REPARACION: {
    label: 'En Reparación',
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
  },
  LISTA: {
    label: 'Lista',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
  },
  ENTREGADA: {
    label: 'Entregada',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  },
  CANCELADA: {
    label: 'Cancelada',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
  },
};

interface EstadoBadgeProps {
  estado: EstadoOrden;
  className?: string;
}

export function EstadoBadge({ estado, className }: EstadoBadgeProps) {
  const config = ESTADO_CONFIG[estado];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
