/**
 * Configuración de características del sistema
 * 
 * Este archivo controla qué funcionalidades están habilitadas o deshabilitadas.
 * Es útil para personalizar el sistema para diferentes clientes sin modificar el código.
 * 
 * Para habilitar una característica, cambiar el valor a `true`.
 * Para deshabilitarla, cambiar el valor a `false`.
 */

export const FEATURES = {
  /**
   * Habilita el campo SKU en el formulario de productos y la tabla
   * @default false - Cliente actual no lo requiere
   */
  ENABLE_PRODUCT_SKU: false,

  /**
   * Habilita el campo Código de Barras en el formulario de productos
   * @default false - Cliente actual no lo requiere
   */
  ENABLE_PRODUCT_BARCODE: false,

  /**
   * Habilita la funcionalidad de imágenes de productos (subida, visualización)
   * @default false - Cliente actual no lo requiere para registro rápido
   */
  ENABLE_PRODUCT_IMAGES: false,
} as const;

/**
 * Función auxiliar para verificar si una característica está habilitada
 */
export const isFeatureEnabled = (feature: keyof typeof FEATURES): boolean => {
  return FEATURES[feature];
};
