import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useRef, useEffect } from 'react';
import { FEATURES } from '@/config/features';
import { SeriesEscanerModal } from '@/components/SeriesEscanerModal';
import { CategoriaCombobox } from '@/components/forms/CategoriaCombobox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  Producto,
  CrearProductoDto,
  ActualizarProductoDto,
  Categoria,
  Ubicacion,
} from '@/types';

// Helper para construir URL completa de imagen
const getImageUrl = (imagenUrl: string | null): string | null => {
  if (!imagenUrl) return null;
  if (imagenUrl.startsWith('http')) return imagenUrl;
  // Si es ruta relativa, agregar la URL del backend
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const baseUrl = API_URL.replace('/api', ''); // Eliminar /api si existe
  return `${baseUrl}${imagenUrl}`;
};

const productoSchema = z.object({
  nombre: z
    .string({ message: 'El nombre es requerido' })
    .min(1, 'El nombre es requerido')
    .max(200, 'El nombre no puede exceder 200 caracteres'),
  descripcion: z
    .string()
    .max(255, 'La descripción no puede exceder 255 caracteres')
    .optional()
    .or(z.literal('')),
  categoriaId: z
    .string({ message: 'La categoría es requerida' })
    .uuid('ID de categoría inválido'),
  ubicacionId: z
    .string()
    .uuid('ID de ubicación inválido')
    .optional()
    .or(z.literal('')),
  marca: z.string().max(100).optional().or(z.literal('')),
  modelo: z.string().max(100).optional().or(z.literal('')),
  sku: z.string().max(50).optional().or(z.literal('')),
  codigoBarras: z.string().max(50).optional().or(z.literal('')),
  precioCompra: z.string().min(1, 'Requerido').regex(/^\d*\.?\d*$/, 'Debe ser un número válido'),
  precioVenta: z.string().min(1, 'Requerido').regex(/^\d*\.?\d*$/, 'Debe ser un número válido'),
  margenReferencia: z.string().regex(/^\d*\.?\d*$/, 'Debe ser un número válido').optional().or(z.literal('')),
  stockActual: z.string().regex(/^\d*$/, 'Debe ser un número entero').optional(),
  stockMinimo: z.string().regex(/^\d*$/, 'Debe ser un número entero').optional(),
  esServicio: z.boolean().optional(),
  esSegundaMano: z.boolean().optional(),
  requiereSerie: z.boolean().optional(),
  garantiaProveedorMeses: z.string().regex(/^\d*$/, 'Debe ser un número entero').optional(),
  garantiaClienteMeses: z.string().regex(/^\d*$/, 'Debe ser un número entero').optional(),
  padreId: z
    .string()
    .uuid('ID de producto padre inválido')
    .optional()
    .or(z.literal('')),
  imagenUrl: z.string().optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  if (!data.esServicio) {
    const stockMin = Number.parseInt(data.stockMinimo || '0');
    const precioV = Number.parseFloat(data.precioVenta || '0');
    const precioC = Number.parseFloat(data.precioCompra || '0');

    if (!data.ubicacionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Requerido para productos físicos',
        path: ['ubicacionId'],
      });
    }
    if (stockMin < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El stock mínimo no puede ser negativo",
        path: ["stockMinimo"],
      });
    }
    if (precioV <= precioC) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El precio de venta debe ser mayor al precio de compra (no se puede vender a pérdida)",
        path: ["precioVenta"],
      });
    }
  }
});

type ProductoFormValues = z.infer<typeof productoSchema>;

interface ProductoFormProps {
  producto?: Producto | null;
  onSuccess: () => void;
  onCreate: (data: CrearProductoDto | FormData) => Promise<Producto>;
  onUpdate: (id: string, data: ActualizarProductoDto | FormData) => Promise<Producto>;
  categorias: Categoria[];
  ubicaciones: Ubicacion[];
  onCategoriaCreada?: (categoria: { id: string; nombre: string }) => void;
}

export function ProductoForm({
  producto,
  onSuccess,
  onCreate,
  onUpdate,
  categorias,
  ubicaciones,
  onCategoriaCreada,
}: Readonly<ProductoFormProps>) {
  const [esServicio, setEsServicio] = useState(producto?.esServicio || false);
  const [modoMargen, setModoMargen] = useState<boolean>(false); // false = Modo Precio, true = Modo Margen
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    getImageUrl(producto?.imagenUrl || null)
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para modal de series retroactivas
  const [seriesModalOpen, setSeriesModalOpen] = useState(false);
  const [_seriesRetroactivas, setSeriesRetroactivas] = useState<string[]>([]);
  // Ref síncrono para evitar stale closures al verificar series escaneadas
  const seriesRetroactivasRef = useRef<string[]>([]);
  // Guarda los datos del form cuando hay que escanear antes de guardar (nuevo producto)
  const pendingSubmitRef = useRef<ProductoFormValues | null>(null);
  const prevRequiereSerieRef = useRef<boolean>(producto?.requiereSerie || false);

  const form = useForm<ProductoFormValues>({
    resolver: zodResolver(productoSchema),
    defaultValues: {
      nombre: producto?.nombre || '',
      descripcion: producto?.descripcion || '',
      categoriaId: producto?.categoriaId || '',
      ubicacionId: producto?.ubicacionId || '',
      marca: producto?.marca || '',
      modelo: producto?.modelo || '',
      sku: producto?.sku || '',
      codigoBarras: producto?.codigoBarras || '',
      precioCompra: producto?.precioCompra?.toString() || '',
      precioVenta: producto?.precioVenta?.toString() || '',
      margenReferencia: producto?.margenReferencia?.toString() || '',
      stockActual: producto?.stockActual?.toString() || '',
      stockMinimo: producto?.stockMinimo?.toString() || '',
      esServicio: producto?.esServicio || false,
      esSegundaMano: producto?.esSegundaMano || false,
      requiereSerie: producto?.requiereSerie || false,
      garantiaProveedorMeses: producto?.garantiaProveedorMeses?.toString() || '0',
      garantiaClienteMeses: producto?.garantiaClienteMeses?.toString() || '0',
      padreId: producto?.padreId || '',
      imagenUrl: producto?.imagenUrl || '',
    },
  });

  // Limpiar campos cuando se marca como servicio
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'esServicio' && value.esServicio) {
        // Resetear campos que no aplican para servicios
        form.setValue('marca', '');
        form.setValue('modelo', '');
        form.setValue('ubicacionId', '');
        form.setValue('stockActual', '0');
        form.setValue('stockMinimo', '0');
        form.setValue('precioCompra', '0');
        if (FEATURES.ENABLE_PRODUCT_SKU) form.setValue('sku', '');
        if (FEATURES.ENABLE_PRODUCT_BARCODE) form.setValue('codigoBarras', '');
        // Resetear campos específicos de productos físicos
        form.setValue('esSegundaMano', false);
        form.setValue('requiereSerie', false);
        form.setValue('garantiaProveedorMeses', '0');
        form.setValue('garantiaClienteMeses', '0');
        setEsServicio(true);
      } else if (name === 'esServicio' && !value.esServicio) {
        setEsServicio(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Detectar cuando se activa requiereSerie en producto con stock existente
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'requiereSerie' && value.requiereSerie && !prevRequiereSerieRef.current) {
        // Se acaba de activar requiereSerie
        const stockActual = producto?.stockActual || 0;
        
        if (producto && stockActual > 0) {
          // Producto en edición con stock existente - abrir modal para registrar series
          setSeriesModalOpen(true);
        }
        
        prevRequiereSerieRef.current = true;
      } else if (name === 'requiereSerie' && !value.requiereSerie) {
        prevRequiereSerieRef.current = false;
        setSeriesRetroactivas([]); // Limpiar series si se desactiva
      }
    });
    return () => subscription.unsubscribe();
  }, [form, producto]);

  // Calcular precio de venta automáticamente en Modo Margen
  useEffect(() => {
    if (!modoMargen) return;

    const subscription = form.watch((value, { name }) => {
      if (name === 'precioCompra' || name === 'margenReferencia') {
        const precioCompra = Number.parseFloat(value.precioCompra || '0');
        const margen = Number.parseFloat(value.margenReferencia || '0');

        if (precioCompra > 0 && margen >= 0) {
          const precioVenta = precioCompra * (1 + margen / 100);
          form.setValue('precioVenta', precioVenta.toFixed(2));
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, modoMargen]);

  // Calcular margen automáticamente en Modo Precio
  useEffect(() => {
    if (modoMargen) return; // Solo aplica en modo precio

    const subscription = form.watch((value, { name }) => {
      if (name === 'precioCompra' || name === 'precioVenta') {
        const precioCompra = Number.parseFloat(value.precioCompra || '0');
        const precioVenta = Number.parseFloat(value.precioVenta || '0');

        if (precioCompra > 0 && precioVenta > precioCompra) {
          const margen = ((precioVenta - precioCompra) / precioCompra) * 100;
          form.setValue('margenReferencia', margen.toFixed(2));
        } else if (precioVenta === 0 || precioCompra === 0) {
          // Limpiar margen si los precios no son válidos
          form.setValue('margenReferencia', '');
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, modoMargen]);

  // Corregir margenReferencia desactualizado al cargar producto en edición
  useEffect(() => {
    if (!producto) return; // Solo para productos en edición
    
    const precioCompra = Number.parseFloat(producto.precioCompra?.toString() || '0');
    const precioVenta = Number.parseFloat(producto.precioVenta?.toString() || '0');
    const margenGuardado = Number.parseFloat(producto.margenReferencia?.toString() || '0');
    
    // Calcular margen real basado en los precios actuales
    if (precioCompra > 0 && precioVenta > precioCompra) {
      const margenReal = ((precioVenta - precioCompra) / precioCompra) * 100;
      
      // Si el margen guardado difiere del real por más de 0.5%, corregirlo
      const diferencia = Math.abs(margenReal - margenGuardado);
      if (diferencia > 0.5) {
        form.setValue('margenReferencia', margenReal.toFixed(2));
      }
    }
  }, [producto, form]);

  const onSubmit = async (data: ProductoFormValues) => {
    // NUEVO PRODUCTO: Si requiere serie y tiene stock inicial, abrir escáner ANTES de guardar
    if (!producto && data.requiereSerie && Number.parseInt(data.stockActual || '0') > 0 && seriesRetroactivasRef.current.length === 0) {
      pendingSubmitRef.current = data;
      setSeriesModalOpen(true);
      return; // Esperar a que se completen las series; handleSeriesCompletas re-lanzará el guardado
    }

    try {
      // Crear FormData para enviar archivo
      const formData = new FormData();
      
      // Agregar todos los campos
      formData.append('nombre', data.nombre);
      if (data.descripcion) formData.append('descripcion', data.descripcion);
      formData.append('categoriaId', data.categoriaId);
      if (data.ubicacionId) formData.append('ubicacionId', data.ubicacionId);
      if (data.marca) formData.append('marca', data.marca);
      if (data.modelo) formData.append('modelo', data.modelo);
      if (FEATURES.ENABLE_PRODUCT_SKU && data.sku) formData.append('sku', data.sku);
      if (FEATURES.ENABLE_PRODUCT_BARCODE && data.codigoBarras) formData.append('codigoBarras', data.codigoBarras);
      formData.append('precioCompra', data.precioCompra);
      formData.append('precioVenta', data.precioVenta);
      if (data.margenReferencia) formData.append('margenReferencia', data.margenReferencia);
      
      if (!esServicio) {
        // stockActual solo se envía al CREAR (trazabilidad - las ediciones usan PATCH /stock)
        if (!producto) {
          formData.append('stockActual', data.stockActual || '0');
        }
        // stockMinimo sí se puede actualizar siempre
        formData.append('stockMinimo', data.stockMinimo || '0');
      }
      
      formData.append('esServicio', data.esServicio ? 'true' : 'false');
      formData.append('esSegundaMano', data.esSegundaMano ? 'true' : 'false');
      formData.append('requiereSerie', data.requiereSerie ? 'true' : 'false');
      formData.append('garantiaProveedorMeses', data.garantiaProveedorMeses || '0');
      formData.append('garantiaClienteMeses', data.garantiaClienteMeses || '0');
      if (data.padreId) formData.append('padreId', data.padreId);
      
      // Agregar series retroactivas usando el ref (evita stale closures)
      if (seriesRetroactivasRef.current.length > 0) {
        formData.append('seriesRetroactivas', JSON.stringify(seriesRetroactivasRef.current));
      }
      
      // Agregar archivo si existe (solo si la funcionalidad está habilitada)
      if (FEATURES.ENABLE_PRODUCT_IMAGES && imagenFile) {
        formData.append('imagen', imagenFile);
      }

      if (producto) {
        await onUpdate(producto.id, formData);
      } else {
        await onCreate(formData);
      }
      
      onSuccess();
      form.reset();
      setImagenFile(null);
      setPreviewUrl(null);
      seriesRetroactivasRef.current = [];
      setSeriesRetroactivas([]);
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  };

  const handleSeriesCompletas = (series: string[]) => {
    // Actualizar ref síncronamente para evitar stale closures
    seriesRetroactivasRef.current = series;
    setSeriesRetroactivas(series);
    setSeriesModalOpen(false);

    // Si había un submit pendiente (nuevo producto esperando escaneo), re-lanzar guardado
    if (pendingSubmitRef.current !== null) {
      pendingSubmitRef.current = null;
      form.handleSubmit(onSubmit)();
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagenFile(file);
      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 py-4">
        
        {/* Sección: Información General */}
        <section className="space-y-4">
           <div className="flex items-center gap-2 border-b border-border pb-2">
              <span className="material-symbols-outlined text-primary text-[20px]">info</span>
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Información General</h3>
           </div>
           
           <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 gap-2">
                  <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del Producto *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej. Pantalla iPhone 13 Original" {...field} className="bg-background border-border focus:ring-primary/20" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>

              {/* Marca y Modelo (solo para productos físicos) */}
              {!esServicio && (
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="marca"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marca</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej. Apple" {...field} className="bg-background border-border" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="modelo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modelo</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej. iPhone 13" {...field} className="bg-background border-border" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
              )}

              {/* Campo Descripción (disponible para productos y servicios) */}
              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descripción breve del producto (opcional)" 
                        {...field} 
                        className="bg-background border-border resize-none"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                  
              {/* Feature: SKU y Código de Barras - Controlado por config/features.ts */}
              {!esServicio && (FEATURES.ENABLE_PRODUCT_SKU || FEATURES.ENABLE_PRODUCT_BARCODE) && (
                <div className="grid grid-cols-2 gap-4">
                  {FEATURES.ENABLE_PRODUCT_SKU && (
                    <FormField
                      control={form.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SKU</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input placeholder="GEN-AUTO-001" {...field} className="bg-background border-border font-mono text-sm" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {FEATURES.ENABLE_PRODUCT_BARCODE && (
                    <FormField
                      control={form.control}
                      name="codigoBarras"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código de Barras</FormLabel>
                          <FormControl>
                            <Input placeholder="EAN/UPC" {...field} className="bg-background border-border font-mono text-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}
           </div>
        </section>

        {/* Sección: Clasificación */}
        <section className="space-y-4">
           <div className="flex items-center gap-2 border-b border-border pb-2">
              <span className="material-symbols-outlined text-primary text-[20px]">category</span>
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Clasificación y Estado</h3>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                 <FormField
                    control={form.control}
                    name="categoriaId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría *</FormLabel>
                        <CategoriaCombobox
                          value={field.value}
                          onChange={field.onChange}
                          categorias={categorias}
                          onCategoriaCreada={onCategoriaCreada}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {!esServicio && (
                      <FormField
                        control={form.control}
                        name="ubicacionId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ubicación Física</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-background border-border">
                                  <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {ubicaciones.map((ubi) => (
                                  <SelectItem key={ubi.id} value={ubi.id}>{ubi.nombre}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  )}
              </div>
              
              <div className="bg-muted/40 p-4 rounded-lg border border-border space-y-4">
                  <FormField
                    control={form.control}
                    name="esServicio"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                         <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium text-foreground block">Es Servicio</FormLabel>
                            <FormDescription className="text-xs text-muted-foreground">Activa campos específicos para servicios.</FormDescription>
                         </div>
                         <FormControl>
                            <Switch checked={field.value} onCheckedChange={(c) => { field.onChange(c); setEsServicio(c); }} />
                         </FormControl>
                      </FormItem>
                    )}
                  />
                  {!esServicio && (
                    <FormField
                      control={form.control}
                      name="esSegundaMano"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div className="space-y-0.5">
                              <FormLabel className="text-sm font-medium text-foreground block">Es Segunda Mano</FormLabel>
                              <FormDescription className="text-xs text-muted-foreground">Marca el producto como usado.</FormDescription>
                          </div>
                          <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
              </div>
           </div>
        </section>

        {/* Sección: Precios y Stock */}
        <section className="space-y-4">
           <div className="flex items-center gap-2 border-b border-border pb-2">
              <span className="material-symbols-outlined text-primary text-[20px]">payments</span>
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Precios y Stock</h3>
              {!esServicio && (
                <div className="ml-auto flex items-center gap-2">
                  <Badge variant={!modoMargen ? "default" : "outline"} className="cursor-pointer" onClick={() => setModoMargen(false)}>
                    Por Precio
                  </Badge>
                  <Badge variant={modoMargen ? "default" : "outline"} className="cursor-pointer" onClick={() => setModoMargen(true)}>
                    Por Margen %
                  </Badge>
                </div>
              )}
           </div>
           
           {/* Fila 1: Precios y Margen */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {!esServicio && (
                <FormField
                  control={form.control}
                  name="precioCompra"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio Compra (S/.)</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          className="bg-background border-border" 
                          placeholder="0.00"
                          {...field} 
                          value={field.value === '0' ? '' : field.value}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*\.?\d{0,2}$/.test(value)) {
                                field.onChange(value);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                      <FormDescription>CPP - Costo Promedio</FormDescription>
                    </FormItem>
                  )}
                />
              )}
              
              {/* Modo Precio: Usuario ingresa precio venta manualmente */}
              {!modoMargen && (
                <FormField
                  control={form.control}
                  name="precioVenta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio Venta (S/.)</FormLabel>
                      <FormControl>
                          <Input 
                            type="text" 
                            className="bg-background border-border" 
                            placeholder="0.00"
                            {...field} 
                            value={field.value === '0' ? '' : field.value}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (/^\d*\.?\d{0,2}$/.test(value)) {
                                  field.onChange(value);
                              }
                            }}
                          />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {/* Modo Margen: Usuario ingresa porcentaje de margen */}
              {modoMargen && (
                <FormField
                  control={form.control}
                  name="margenReferencia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Margen Deseado (%)</FormLabel>
                      <FormControl>
                          <Input 
                            type="text" 
                            className="bg-background border-border" 
                            placeholder="30"
                            {...field} 
                            onChange={(e) => {
                              const value = e.target.value;
                              if (/^\d*\.?\d{0,2}$/.test(value)) {
                                  field.onChange(value);
                              }
                            }}
                          />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {/* Modo Margen: Mostrar precio de venta calculado */}
              {modoMargen && !esServicio && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Precio Venta</label>
                  <div className="h-10 px-3 py-2 rounded-md border border-border bg-muted/50 text-sm flex items-center font-semibold">
                    S/. {form.watch('precioVenta') || '0.00'}
                  </div>
                </div>
              )}
              
              {/* Modo Precio: Mostrar margen calculado (como antes) */}
              {!modoMargen && !esServicio && (
                  <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Ganancia / Margen</label>
                      <div className="h-10 px-3 py-2 rounded-md border border-border bg-muted/50 text-sm flex items-center justify-between text-muted-foreground font-mono">
                          <span>
                              S/. {((Number.parseFloat(form.watch('precioVenta') || '0') || 0) - (Number.parseFloat(form.watch('precioCompra') || '0') || 0)).toFixed(2)}
                          </span>
                          <span className={cn(
                              "text-xs font-bold px-1.5 py-0.5 rounded",
                              ((Number.parseFloat(form.watch('precioVenta') || '0') || 0) - (Number.parseFloat(form.watch('precioCompra') || '0') || 0)) > 0 
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                                  : "bg-destructive/10 text-destructive"
                          )}>
                              {(() => {
                                  const compra = Number.parseFloat(form.watch('precioCompra') || '0') || 0;
                                  const venta = Number.parseFloat(form.watch('precioVenta') || '0') || 0;
                                  if (!compra) return '0%';
                                  const margen = ((venta - compra) / compra) * 100;
                                  return `${margen.toFixed(1)}%`;
                              })()}
                          </span>
                      </div>
                  </div>
              )}
           </div>

           {/* Fila 2: Stocks */}
           {!esServicio && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {!producto && (
                      <FormField
                        control={form.control}
                        name="stockActual"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stock Inicial</FormLabel>
                            <FormControl>
                                <Input 
                                  type="text" 
                                  className="bg-background border-border" 
                                  placeholder="0"
                                  {...field} 
                                  value={field.value === '0' ? '' : field.value}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (/^\d*$/.test(value)) {
                                        field.onChange(value);
                                    }
                                  }}
                                />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                   )}
                   <FormField
                     control={form.control}
                     name="stockMinimo"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Stock Mínimo</FormLabel>
                         <FormControl>
                            <Input 
                              type="text" 
                              className="bg-background border-border" 
                              placeholder="0"
                              {...field} 
                              value={field.value === '0' ? '' : field.value}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (/^\d*$/.test(value)) {
                                    field.onChange(value);
                                }
                              }}
                            />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
               </div>
           )}
        </section>

        {/* Sección: Atributos y Configuración (FASE 3: Series y Garantías) */}
        {!esServicio && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <span className="material-symbols-outlined text-primary text-[20px]">settings</span>
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Atributos y Configuración</h3>
            </div>
            
            <div className="space-y-4">
              {/* Switch: Requiere Número de Serie */}
              <FormField
                control={form.control}
                name="requiereSerie"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between bg-muted/40 p-4 rounded-lg border border-border">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium text-foreground block">
                        ¿Requiere Número de Serie?
                      </FormLabel>
                      <FormDescription className="text-xs text-muted-foreground">
                        Activar para productos que necesitan seguimiento individual (laptops, celulares, equipos).
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Garantías */}
              <div className="bg-muted/40 p-4 rounded-lg border border-border space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-primary text-[16px]">verified_user</span>
                  <h4 className="text-sm font-medium text-foreground">Garantías</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="garantiaProveedorMeses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Garantía Proveedor (Meses)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="0"
                            {...field}
                            className="bg-background border-border"
                            onChange={(e) => {
                              const value = e.target.value;
                              if (/^\d*$/.test(value)) {
                                field.onChange(value);
                              }
                            }}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Garantía que ofrece el proveedor
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="garantiaClienteMeses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Garantía Cliente (Meses)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="0"
                            {...field}
                            className="bg-background border-border"
                            onChange={(e) => {
                              const value = e.target.value;
                              if (/^\d*$/.test(value)) {
                                field.onChange(value);
                              }
                            }}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Garantía que ofreces a tus clientes
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </section>
        )}
        
        {/* Feature: Imagen - Controlado por config/features.ts */}
        {FEATURES.ENABLE_PRODUCT_IMAGES && (
          <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <span className="material-symbols-outlined text-primary text-[20px]">image</span>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Imagen</h3>
            </div>
              <FormField
                  control={form.control}
                  name="imagenUrl"
                  render={() => (
                    <FormItem>
                      <FormLabel>Imagen del Producto</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          <Input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="bg-background border-border cursor-pointer"
                          />
                          {previewUrl && (
                            <div className="relative w-32 h-32 border rounded-md overflow-hidden">
                              <img
                                src={previewUrl}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Formatos: JPG, PNG, WebP, GIF (Máx. 5MB). Se redimensionará automáticamente.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
              />
          </section>
        )}

        <div className="flex justify-end pt-4 border-t border-border">
          <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto font-bold shadow-md shadow-primary/20">
            {form.formState.isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {producto ? 'Guardar Cambios' : 'Guardar Producto'}
          </Button>
        </div>
      </form>

      {/* Modal para registrar series retroactivas (nuevo producto o edición con stock existente) */}
      {seriesModalOpen && (
        <SeriesEscanerModal
          isOpen={seriesModalOpen}
          onClose={() => {
            setSeriesModalOpen(false);
            pendingSubmitRef.current = null; // Cancelar submit pendiente si lo hay
            // Solo desactivar requiereSerie si el usuario cerró sin completar el escaneo
            // Usar ref en lugar de state para evitar stale closures
            if (seriesRetroactivasRef.current.length === 0) {
              form.setValue('requiereSerie', false);
              prevRequiereSerieRef.current = false;
            }
          }}
          productoNombre={producto?.nombre ?? form.getValues('nombre')}
          cantidad={producto ? producto.stockActual : Number.parseInt(form.getValues('stockActual') || '0')}
          onSeriesCompletas={handleSeriesCompletas}
          modo="compra"
        />
      )}
    </Form>
  );
}
