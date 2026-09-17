import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useRef, useEffect } from 'react';
import { CategoriaCombobox } from '@/components/forms/CategoriaCombobox';
import { MarcaCombobox } from '@/components/forms/MarcaCombobox';
import { UbicacionCombobox } from '@/components/forms/UbicacionCombobox';
import { useMarcas } from '@/hooks/useMarcas';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Loader2, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import type {
  Producto,
  CrearProductoDto,
  ActualizarProductoDto,
  Categoria,
  TipoItem,
} from '@/types';

// Helper para construir URL completa de imagen
const getImageUrl = (imagenUrl: string | null): string | null => {
  if (!imagenUrl) return null;
  if (imagenUrl.startsWith('http')) return imagenUrl;
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const baseUrl = API_URL.replace('/api', '');
  return `${baseUrl}${imagenUrl}`;
};

const productoSchema = z
  .object({
    tipo: z.enum(['PRODUCTO', 'SERVICIO']),
    categoriaId: z
      .string({ message: 'La categoría es requerida' })
      .min(1, 'La categoría es requerida'),
    modelo: z.string().max(100).optional().or(z.literal('')),
    descripcion: z.string().max(255).optional().or(z.literal('')),
    precioCompra: z
      .string()
      .regex(/^\d*\.?\d*$/, 'Debe ser un número válido')
      .optional()
      .or(z.literal('')),
    precioVenta: z
      .string()
      .min(1, 'El precio de venta es requerido')
      .regex(/^\d*\.?\d*$/, 'Debe ser un número válido')
      .refine((val) => Number.parseFloat(val) > 0, 'El precio debe ser mayor a 0'),
    margenReferencia: z
      .string()
      .regex(/^\d*\.?\d*$/, 'Debe ser un número válido')
      .optional()
      .or(z.literal('')),
    stockActual: z.string().regex(/^\d*$/, 'Debe ser un número entero').optional().or(z.literal('')),
    stockMinimo: z.string().regex(/^\d*$/, 'Debe ser un número entero').optional().or(z.literal('')),
    sku: z.string().max(50).optional().or(z.literal('')),
    codigoBarras: z.string().max(50).optional().or(z.literal('')),
    requiereSerie: z.boolean().optional(),
    garantiaProveedorMeses: z.string().regex(/^\d*$/, 'Debe ser un número entero').optional().or(z.literal('')),
    garantiaClienteMeses: z.string().regex(/^\d*$/, 'Debe ser un número entero').optional().or(z.literal('')),
    padreId: z.string().optional().or(z.literal('')),
    imagenUrl: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.tipo === 'PRODUCTO') {
      const precioV = Number.parseFloat(data.precioVenta || '0');
      const precioC = Number.parseFloat(data.precioCompra || '0');
      if (precioC > 0 && precioV > 0 && precioV < precioC) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El precio de venta debe ser mayor o igual al precio de compra',
          path: ['precioVenta'],
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
  onCategoriaCreada?: (categoria: Categoria) => void;
  onCategoriaActualizada?: (categoria: Categoria) => void;
  onCategoriaEliminada?: (id: string) => void;
}

export function ProductoForm({
  producto,
  onSuccess,
  onCreate,
  onUpdate,
  categorias,
  onCategoriaCreada,
  onCategoriaActualizada,
  onCategoriaEliminada,
}: Readonly<ProductoFormProps>) {
  const [atributosOpen, setAtributosOpen] = useState(false);
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(
    producto?.imagenUrl ? getImageUrl(producto.imagenUrl) : null
  );
  const [isCalculatedPrice, setIsCalculatedPrice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialTipo: TipoItem = producto?.tipo || (producto?.esServicio ? 'SERVICIO' : 'PRODUCTO');

  const form = useForm<ProductoFormValues>({
    resolver: zodResolver(productoSchema),
    defaultValues: {
      tipo: initialTipo,
      categoriaId: producto?.categoriaId || '',
      modelo: producto?.modelo || '',
      descripcion: producto?.descripcion || '',
      precioCompra: producto?.precioCompra !== undefined && producto?.precioCompra !== null ? producto.precioCompra.toString() : '',
      precioVenta: producto?.precioVenta !== undefined && producto?.precioVenta !== null ? producto.precioVenta.toString() : '',
      margenReferencia: producto?.margenReferencia !== undefined && producto?.margenReferencia !== null ? producto.margenReferencia.toString() : '',
      stockActual: producto?.stockActual !== undefined && producto?.stockActual !== null ? producto.stockActual.toString() : '',
      stockMinimo: producto?.stockMinimo !== undefined && producto?.stockMinimo !== null ? producto.stockMinimo.toString() : '',
      sku: producto?.sku || '',
      codigoBarras: producto?.codigoBarras || '',
      requiereSerie: producto?.requiereSerie || false,
      garantiaProveedorMeses: producto?.garantiaProveedorMeses !== undefined && producto?.garantiaProveedorMeses !== null ? producto.garantiaProveedorMeses.toString() : '',
      garantiaClienteMeses: producto?.garantiaClienteMeses !== undefined && producto?.garantiaClienteMeses !== null ? producto.garantiaClienteMeses.toString() : '',
      padreId: producto?.padreId || '',
      imagenUrl: producto?.imagenUrl || '',
    },
  });

  const selectedTipo = form.watch('tipo');
  const isServicio = selectedTipo === 'SERVICIO';

  // Recalcular precio sugerido si cambian precioCompra o margenReferencia
  const precioCompraWatch = form.watch('precioCompra');
  const margenReferenciaWatch = form.watch('margenReferencia');

  useEffect(() => {
    if (isServicio) return;
    const compra = Number.parseFloat(precioCompraWatch || '0');
    const margen = Number.parseFloat(margenReferenciaWatch || '0');

    if (compra > 0 && margen > 0 && isCalculatedPrice) {
      const sugerido = compra * (1 + margen / 100);
      form.setValue('precioVenta', sugerido.toFixed(2));
    }
  }, [precioCompraWatch, margenReferenciaWatch, isCalculatedPrice, form, isServicio]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagenFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagenPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagenFile(null);
    setImagenPreview(null);
    form.setValue('imagenUrl', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data: ProductoFormValues) => {
    try {
      const isServ = data.tipo === 'SERVICIO';

      const payloadData = {
        tipo: data.tipo,
        categoriaId: data.categoriaId,
        modelo: isServ ? undefined : data.modelo?.trim().toUpperCase() || undefined,
        descripcion: data.descripcion ? data.descripcion.trim().toUpperCase() : undefined,
        precioCompra: isServ ? 0 : Number.parseFloat(data.precioCompra || '0'),
        precioVenta: Number.parseFloat(data.precioVenta),
        margenReferencia: isServ || !data.margenReferencia ? undefined : Number.parseFloat(data.margenReferencia),
        stockActual: isServ ? 0 : Number.parseInt(data.stockActual || '0', 10),
        stockMinimo: isServ ? 0 : Number.parseInt(data.stockMinimo || '1', 10),
        sku: isServ ? undefined : data.sku?.trim().toUpperCase() || undefined,
        codigoBarras: isServ ? undefined : data.codigoBarras?.trim().toUpperCase() || undefined,
        requiereSerie: isServ ? false : data.requiereSerie || false,
        garantiaProveedorMeses: isServ ? 0 : Number.parseInt(data.garantiaProveedorMeses || '0', 10),
        garantiaClienteMeses: isServ ? 0 : Number.parseInt(data.garantiaClienteMeses || '0', 10),
        padreId: isServ ? undefined : data.padreId || undefined,
        esServicio: isServ,
        esSegundaMano: false,
      };

      if (producto) {
        // Al Editar: enviamos stockMinimo y excluimos stockActual del payload PUT
        const { stockActual, ...updatePayload } = payloadData;

        if (imagenFile) {
          const formData = new FormData();
          Object.entries(updatePayload).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              formData.append(key, typeof value === 'boolean' ? String(value) : (value as any));
            }
          });
          formData.append('imagen', imagenFile);
          await onUpdate(producto.id, formData);
        } else {
          await onUpdate(producto.id, updatePayload as ActualizarProductoDto);
        }
      } else {
        // Al Crear: enviamos stockActual y stockMinimo
        if (imagenFile) {
          const formData = new FormData();
          Object.entries(payloadData).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              formData.append(key, typeof value === 'boolean' ? String(value) : (value as any));
            }
          });
          formData.append('imagen', imagenFile);
          await onCreate(formData);
        } else {
          await onCreate(payloadData as CrearProductoDto);
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Error al guardar producto:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Campo Tipo (Opciones fijas: PRODUCTO / SERVICIO) */}
        <div className="bg-muted/40 p-3 rounded-lg border">
          <FormField
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Tipo de Registro *
                </FormLabel>
                <Select
                  onValueChange={(val: TipoItem) => {
                    field.onChange(val);
                    form.setValue('categoriaId', ''); // Resetear categoría al cambiar de tipo
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="h-10 bg-background font-semibold text-foreground">
                      <SelectValue placeholder="Selecciona el tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="PRODUCTO">PRODUCTO (Ítem físico con stock y modelo)</SelectItem>
                    <SelectItem value="SERVICIO">SERVICIO (Mano de obra / Reparación / Mantenimiento)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Categoría (filtrada por el tipo seleccionado) */}
        <FormField
          control={form.control}
          name="categoriaId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría *</FormLabel>
              <FormControl>
                <CategoriaCombobox
                  value={field.value}
                  onChange={(id) => field.onChange(id)}
                  categorias={categorias}
                  tipo={selectedTipo}
                  showCreateButton={!producto}
                  showSettingsButton={true}
                  onCategoriaCreada={onCategoriaCreada}
                  onCategoriaActualizada={onCategoriaActualizada}
                  onCategoriaEliminada={onCategoriaEliminada}
                  placeholder={`Seleccionar categoría de ${selectedTipo.toLowerCase()}...`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Si es PRODUCTO: campo Modelo */}
        {!isServicio && (
          <FormField
            control={form.control}
            name="modelo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modelo *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej: LOGITECH G502 / L355 / 240GB"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  El nombre comercial completo (DETALLE) será: Categoría + Modelo
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Campo Descripción (común a ambos) */}
        <FormField
          control={form.control}
          name="descripcion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción (Opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detalles adicionales, especificaciones breves..."
                  rows={2}
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Sección de Precios y Stock */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
          {/* Si es PRODUCTO: Precio de Compra */}
          {!isServicio && (
            <FormField
              control={form.control}
              name="precioCompra"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio Compra (S/)</FormLabel>
                  <FormControl>
                    <Input placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Precio de Venta (obligatorio para ambos) */}
          <FormField
            control={form.control}
            name="precioVenta"
            render={({ field }) => (
              <FormItem className={isServicio ? 'md:col-span-2' : ''}>
                <FormLabel className="font-semibold text-primary">Precio Venta (S/) *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      setIsCalculatedPrice(false);
                    }}
                    className="font-semibold text-base"
                  />
                </FormControl>
                {isServicio && (
                  <FormDescription className="text-xs text-muted-foreground">
                    Este precio es referencial; durante las ventas se podrá editar dinámicamente y actualizará el catálogo al finalizar.
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Si es PRODUCTO: Stock Actual y Mínimo */}
        {!isServicio && (
          <div className="grid grid-cols-2 gap-4">
            {!producto && (
              <FormField
                control={form.control}
                name="stockActual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Inicial</FormLabel>
                    <FormControl>
                      <Input placeholder="0" {...field} />
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
                <FormItem className={producto ? 'col-span-2' : ''}>
                  <FormLabel>Stock Mínimo (Alerta)</FormLabel>
                  <FormControl>
                    <Input placeholder="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Sección Atributos y Configuración Avanzada (Compactada/Colapsable) */}
        {!isServicio && (
          <div className="border rounded-lg p-3 bg-muted/20">
            <Collapsible open={atributosOpen} onOpenChange={setAtributosOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full flex justify-between items-center p-0 h-8 hover:bg-transparent font-medium text-xs text-muted-foreground hover:text-foreground"
                >
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Atributos y Configuración Avanzada
                  </span>
                  {atributosOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-4 pt-3 mt-2 border-t text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">SKU</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="SKU-..."
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="codigoBarras"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Código de Barras</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="775..."
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-3 pt-2 border-t">
                  <FormField
                    control={form.control}
                    name="requiereSerie"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-md border p-2.5">
                        <div className="space-y-0.5">
                          <FormLabel className="text-xs font-medium">Control por Números de Serie</FormLabel>
                          <FormDescription className="text-[11px]">
                            Control individual de series para garantías
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch('requiereSerie') && (
                    <div className="grid grid-cols-2 gap-3 bg-muted/40 p-2.5 rounded-md">
                      <FormField
                        control={form.control}
                        name="garantiaProveedorMeses"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Garantía Prov. (Meses)</FormLabel>
                            <FormControl>
                              <Input placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="garantiaClienteMeses"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Garantía Cliente (Meses)</FormLabel>
                            <FormControl>
                              <Input placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                {/* Subida de Imagen */}
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-xs">Imagen del Producto</Label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  {imagenPreview && (
                    <div className="relative inline-block mt-2">
                      <img
                        src={imagenPreview}
                        alt="Preview"
                        className="h-20 w-20 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-5 w-5 p-0 rounded-full"
                        onClick={handleRemoveImage}
                      >
                        ×
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {producto ? 'Actualizar' : 'Crear Registro'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
