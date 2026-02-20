import multer from 'multer';
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';
import { Request, Response, NextFunction } from 'express';

// Configurar multer para almacenar en memoria
const storage = multer.memoryStorage();

// Filtro para aceptar solo imágenes
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen (JPEG, PNG, WebP, GIF)'));
  }
};

// Configurar multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
});

/**
 * Middleware para optimizar y guardar imágenes de productos
 * Redimensiona a máximo 800x800px, convierte a WebP con calidad 80%
 */
export const optimizeProductImage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Si no hay archivo, continuar
    if (!req.file) {
      return next();
    }

    // Crear directorio si no existe
    const uploadsDir = path.join(process.cwd(), 'uploads', 'productos');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generar nombre único para el archivo
    const filename = `${Date.now()}-producto.webp`;
    const filepath = path.join(uploadsDir, filename);

    // Optimizar imagen con sharp
    await sharp(req.file.buffer)
      .resize(800, 800, {
        fit: 'inside', // Mantiene aspect ratio
        withoutEnlargement: true, // No agranda imágenes pequeñas
      })
      .webp({ quality: 80 })
      .toFile(filepath);

    // Guardar ruta relativa en req.body para que el controlador la use
    const relativePath = `/uploads/productos/${filename}`;
    req.body.imagenUrl = relativePath;

    // Limpiar el buffer de memoria
    req.file.buffer = Buffer.from('');

    next();
  } catch (error) {
    console.error('Error al optimizar imagen:', error);
    res.status(500).json({ 
      error: 'Error al procesar la imagen',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

/**
 * Middleware para convertir datos de FormData a tipos correctos
 * Convierte strings a números y booleans según sea necesario
 */
export const parseFormData = (req: Request, res: Response, next: NextFunction): void => {
  // Convertir campos numéricos
  if (req.body.precioCompra) {
    req.body.precioCompra = Number.parseFloat(req.body.precioCompra);
  }
  if (req.body.precioVenta) {
    req.body.precioVenta = Number.parseFloat(req.body.precioVenta);
  }
  if (req.body.stockActual) {
    req.body.stockActual = Number.parseInt(req.body.stockActual, 10);
  }
  if (req.body.stockMinimo) {
    req.body.stockMinimo = Number.parseInt(req.body.stockMinimo, 10);
  }

  // Convertir campos booleanos
  if (req.body.esServicio !== undefined) {
    req.body.esServicio = req.body.esServicio === 'true' || req.body.esServicio === true;
  }
  if (req.body.esSegundaMano !== undefined) {
    req.body.esSegundaMano = req.body.esSegundaMano === 'true' || req.body.esSegundaMano === true;
  }

  // Convertir strings vacíos a undefined
  Object.keys(req.body).forEach(key => {
    if (req.body[key] === '') {
      req.body[key] = undefined;
    }
  });

  next();
};

/**
 * Middleware para eliminar imagen anterior al actualizar producto
 */
export const deleteOldProductImage = (oldImageUrl: string | null): void => {
  if (!oldImageUrl?.startsWith('/uploads/')) {
    return;
  }

  try {
    const filepath = path.join(process.cwd(), oldImageUrl);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (error) {
    console.error('Error al eliminar imagen anterior:', error);
    // No lanzar error, solo log
  }
};
