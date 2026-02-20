import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { productoService } from '@/services/producto.service';
import type { Producto, AjustarStockDto } from '@/types';

const ajustarStockSchema = z.object({
  tipo: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE'], {
    message: 'Seleccione un tipo de movimiento',
  }),
  cantidad: z.number({ message: 'La cantidad es requerida' }).int().positive(),
  motivo: z
    .string()
    .max(255, 'El motivo no puede exceder 255 caracteres')
    .optional()
    .or(z.literal('')),
});

type AjustarStockFormValues = z.infer<typeof ajustarStockSchema>;

interface AjustarStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  producto: Producto;
  onSuccess: () => void;
}

export function AjustarStockDialog({
  open,
  onOpenChange,
  producto,
  onSuccess,
}: Readonly<AjustarStockDialogProps>) {
  const form = useForm<AjustarStockFormValues>({
    resolver: zodResolver(ajustarStockSchema),
    defaultValues: {
      tipo: 'ENTRADA',
      cantidad: 1,
      motivo: '',
    },
  });

  const onSubmit = async (data: AjustarStockFormValues) => {
    try {
      const payload: AjustarStockDto = {
        tipo: data.tipo,
        cantidad: data.cantidad,
        motivo: data.motivo || '',
      };

      await productoService.ajustarStock(producto.id, payload);
      onSuccess();
      form.reset();
    } catch (error) {
      console.error('Error al ajustar stock:', error);
    }
  };

  const tipoSeleccionado = form.watch('tipo');
  const cantidadSeleccionada = form.watch('cantidad');

  const calcularNuevoStock = () => {
    const stockActual = producto.stockActual;
    switch (tipoSeleccionado) {
      case 'ENTRADA':
        return stockActual + cantidadSeleccionada;
      case 'SALIDA':
        return Math.max(0, stockActual - cantidadSeleccionada);
      case 'AJUSTE':
        return cantidadSeleccionada;
      default:
        return stockActual;
    }
  };

  const getCantidadDescripcion = (tipo: string) => {
    if (tipo === 'AJUSTE') return 'Cantidad exacta a establecer';
    if (tipo === 'ENTRADA') return 'Cantidad a agregar';
    return 'Cantidad a restar';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar Stock</DialogTitle>
          <DialogDescription>
            Producto: {producto.nombre} | Stock actual: {producto.stockActual}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Movimiento *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ENTRADA">Entrada (Agregar stock)</SelectItem>
                      <SelectItem value="SALIDA">Salida (Reducir stock)</SelectItem>
                      <SelectItem value="AJUSTE">Ajuste (Establecer cantidad exacta)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cantidad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(Number.parseInt(e.target.value, 10) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    {getCantidadDescripcion(tipoSeleccionado)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="motivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Compra de nuevo inventario" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-md bg-muted p-4">
              <p className="text-sm">
                <span className="font-medium">Stock actual:</span> {producto.stockActual}
              </p>
              <p className="text-sm">
                <span className="font-medium">Nuevo stock:</span>{' '}
                <span
                  className={
                    calcularNuevoStock() < producto.stockMinimo
                      ? 'text-red-600 font-semibold'
                      : 'text-green-600 font-semibold'
                  }
                >
                  {calcularNuevoStock()}
                </span>
              </p>
              {calcularNuevoStock() < producto.stockMinimo && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ El nuevo stock estará por debajo del mínimo ({producto.stockMinimo})
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirmar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
