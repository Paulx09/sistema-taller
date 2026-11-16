import prisma from '../config/database';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const LOCAL_SELECT = {
  id: true,
  codigo: true,
  nombre: true,
} as const;

export function createBadRequestError(message: string): Error & { statusCode: number } {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = 400;
  return error;
}

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Construye el filtro Prisma para `localId` en listados y métricas.
 * Soporta omitido / `'all'`, `'WEB'` (`localId: null`), o un UUID de local.
 */
export function buildLocalWhereFilter(localId?: string | null): { localId?: string | null } {
  if (!localId) {
    return {};
  }

  const normalized = localId.trim();
  if (!normalized || normalized.toLowerCase() === 'all') {
    return {};
  }

  if (normalized.toUpperCase() === 'WEB') {
    return { localId: null };
  }

  if (!isValidUuid(normalized)) {
    throw createBadRequestError('El filtro de local no es válido');
  }

  return { localId: normalized };
}

class LocalService {
  /** Lista todos los locales activos ordenados alfabéticamente por nombre. */
  async listarActivos() {
    return prisma.local.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        direccion: true,
        activo: true,
      },
    });
  }

  /** Valida que `localId` esté presente, sea UUID válido y corresponda a un local activo. */
  async validarLocalActivo(localId?: string | null) {
    const trimmed = typeof localId === 'string' ? localId.trim() : '';
    if (!trimmed || !isValidUuid(trimmed)) {
      throw createBadRequestError('Debes seleccionar un local válido');
    }

    const local = await prisma.local.findFirst({
      where: { id: trimmed, activo: true },
      select: LOCAL_SELECT,
    });

    if (!local) {
      throw createBadRequestError('Debes seleccionar un local válido');
    }

    return local;
  }
}

export const localService = new LocalService();
export default localService;
