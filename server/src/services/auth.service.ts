import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { env } from '../config/env';

interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    nombreCompleto: string;
    rol: string;
  };
}

class AuthService {
  private readonly JWT_SECRET = env.JWT_SECRET || 'your-secret-key-change-in-production';
  private readonly TOKEN_EXPIRATION = '24h';

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { username, password } = credentials;

    // Buscar usuario por username
    const user = await prisma.usuario.findUnique({
      where: { username },
    });

    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error('Credenciales inválidas');
    }

    // Generar JWT
    const token = jwt.sign(
      { 
        userId: user.id,
        username: user.username,
        rol: user.rol
      },
      this.JWT_SECRET,
      { expiresIn: this.TOKEN_EXPIRATION }
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        nombreCompleto: user.nombreCompleto,
        rol: user.rol,
      },
    };
  }

  async listarUsuarios() {
    return prisma.usuario.findMany({
      select: { id: true, username: true, nombreCompleto: true, rol: true },
      orderBy: { nombreCompleto: 'asc' },
    });
  }

  verifyToken(token: string): { userId: string; username: string; rol: string } {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as {
        userId: string;
        username: string;
        rol: string;
      };
      return decoded;
    } catch (error) {
      throw new Error('Token inválido o expirado');
    }
  }
}

export default new AuthService();
