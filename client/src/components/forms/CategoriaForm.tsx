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
import type { Categoria, CrearCategoriaDto, ActualizarCategoriaDto } from '@/types';

const categoriaSchema = z.object({
  nombre: z
    .string({ message: 'El nombre es requerido' })
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
});

type CategoriaFormValues = z.infer<typeof categoriaSchema>;

interface CategoriaFormProps {
  categoria?: Categoria | null;
  onSuccess: () => void;
  onCreate: (data: CrearCategoriaDto) => Promise<Categoria>;
  onUpdate: (id: string, data: ActualizarCategoriaDto) => Promise<Categoria>;
}

export function CategoriaForm({ categoria, onSuccess, onCreate, onUpdate }: Readonly<CategoriaFormProps>) {
  const form = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: {
      nombre: categoria?.nombre || '',
    },
  });

  const onSubmit = async (data: CategoriaFormValues) => {
    try {
      if (categoria) {
        await onUpdate(categoria.id, data);
      } else {
        await onCreate(data);
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
                <Input placeholder="Ej: Herramientas" {...field} />
              </FormControl>
              <FormDescription>
                Nombre de la categoría (máximo 100 caracteres)
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
            {categoria ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
