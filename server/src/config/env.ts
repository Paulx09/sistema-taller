import { z } from 'zod';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Esquema de validación con Zod
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerida'),
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Validar y parsear
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Error en las variables de entorno:');
  console.error(parsedEnv.error.issues);
  process.exit(1);
}

// Exportar variables tipadas
export const env = {
  DATABASE_URL: parsedEnv.data.DATABASE_URL,
  PORT: Number.parseInt(parsedEnv.data.PORT, 10),
  NODE_ENV: parsedEnv.data.NODE_ENV,
};
