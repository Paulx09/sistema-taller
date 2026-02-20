import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
import { Loader2 } from 'lucide-react';
import type { Ubicacion, CrearUbicacionDto, ActualizarUbicacionDto } from '@/types';

const ubicacionSchema = z.object({
  nombre: z
    .string({ message: 'El nombre es requerido' })
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  descripcion: z
    .string()
    .max(255, 'La descripción no puede exceder 255 caracteres')
    .optional()
    .or(z.literal('')),
});

type UbicacionFormValues = z.infer<typeof ubicacionSchema>;

interface UbicacionFormProps {
  ubicacion?: Ubicacion | null;
  onSuccess: () => void;
  onCreate: (data: CrearUbicacionDto) => Promise<Ubicacion>;
  onUpdate: (id: string, data: ActualizarUbicacionDto) => Promise<Ubicacion>;
}

export function UbicacionForm({ ubicacion, onSuccess, onCreate, onUpdate }: Readonly<UbicacionFormProps>) {
  const form = useForm<UbicacionFormValues>({
    resolver: zodResolver(ubicacionSchema),
    defaultValues: {
      nombre: ubicacion?.nombre || '',
      descripcion: ubicacion?.descripcion || '',
    },
  });

  const onSubmit = async (data: UbicacionFormValues) => {
    try {
      // Convertir string vacío a undefined
      const payload = {
        nombre: data.nombre,
        descripcion: data.descripcion || undefined,
      };

      if (ubicacion) {
        await onUpdate(ubicacion.id, payload);
      } else {
        await onCreate(payload);
      }
      onSuccess();
      form.reset();
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Almacén Principal" {...field} />
              </FormControl>
              <FormDescription>
                Nombre de la ubicación (máximo 100 caracteres)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="descripcion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción (opcional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ej: Ubicación principal para productos terminados"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Descripción opcional (máximo 255 caracteres)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {ubicacion ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
