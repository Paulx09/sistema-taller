import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { AxiosError } from "axios"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extrae el mensaje de error de una respuesta de Axios
 * Priorizamos el mensaje del servidor sobre el mensaje genérico
 */
export function getErrorMessage(error: unknown, defaultMessage: string): string {
  if (error instanceof AxiosError) {
    // Intentar obtener el mensaje del servidor
    const serverMessage = error.response?.data?.error || error.response?.data?.message;
    if (serverMessage) {
      return serverMessage;
    }
    // Si hay un mensaje en el error de Axios
    if (error.message) {
      return error.message;
    }
  }
  
  // Fallback a Error estándar
  if (error instanceof Error) {
    return error.message;
  }
  
  return defaultMessage;
}
