import bcrypt from 'bcrypt';
import prisma from '../config/database';

export type RolGestionable = 'ADMIN' | 'VENDEDOR';

export interface CrearUsuarioInput {
  username: string;
  nombreCompleto: string;
  password: string;
  rol?: RolGestionable;
}

export interface ActualizarUsuarioInput {
  username?: string;
  nombreCompleto?: string;
  rol?: RolGestionable;
}

export class UsuarioServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'UsuarioServiceError';
    this.statusCode = statusCode;
  }
}

const BCRYPT_ROUNDS = 10;

const USUARIO_PUBLIC_SELECT = {
  id: true,
  username: true,
  nombreCompleto: true,
  rol: true,
  createdAt: true,
} as const;

class UsuarioService {
  private async obtenerUsuarioGestionable(id: string) {
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: { id: true, rol: true },
    });

    if (!usuario) {
      throw new UsuarioServiceError('Usuario no encontrado', 404);
    }

    if (usuario.rol === 'SISTEMA') {
      throw new UsuarioServiceError(
        'No está permitido modificar un usuario del sistema',
        403
      );
    }

    return usuario;
  }

  private async verificarUsernameDisponible(username: string, excludeId?: string) {
    const existente = await prisma.usuario.findFirst({
      where: {
        username: { equals: username, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existente) {
      throw new UsuarioServiceError('El nombre de usuario ya está en uso', 409);
    }
  }

  async listar() {
    return prisma.usuario.findMany({
      where: { rol: { not: 'SISTEMA' } },
      select: USUARIO_PUBLIC_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async crear(data: CrearUsuarioInput) {
    const username = data.username.trim();
    const nombreCompleto = data.nombreCompleto.trim();
    const rol: RolGestionable = data.rol ?? 'ADMIN';

    await this.verificarUsernameDisponible(username);

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    return prisma.usuario.create({
      data: {
        username,
        nombreCompleto,
        passwordHash,
        rol,
      },
      select: USUARIO_PUBLIC_SELECT,
    });
  }

  async actualizar(id: string, data: ActualizarUsuarioInput) {
    await this.obtenerUsuarioGestionable(id);

    const updateData: {
      username?: string;
      nombreCompleto?: string;
      rol?: RolGestionable;
    } = {};

    if (data.username !== undefined) {
      const username = data.username.trim();
      await this.verificarUsernameDisponible(username, id);
      updateData.username = username;
    }

    if (data.nombreCompleto !== undefined) {
      updateData.nombreCompleto = data.nombreCompleto.trim();
    }

    if (data.rol !== undefined) {
      updateData.rol = data.rol;
    }

    return prisma.usuario.update({
      where: { id },
      data: updateData,
      select: USUARIO_PUBLIC_SELECT,
    });
  }

  async cambiarPassword(id: string, newPassword: string) {
    await this.obtenerUsuarioGestionable(id);

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await prisma.usuario.update({
      where: { id },
      data: { passwordHash },
      select: { id: true },
    });
  }
}

export default new UsuarioService();
