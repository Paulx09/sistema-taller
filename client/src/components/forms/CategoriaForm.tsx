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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { Categoria, CrearCategoriaDto, ActualizarCategoriaDto, TipoItem } from '@/types';

const categoriaSchema = z.object({
  nombre: z
    .string({ message: 'El nombre es requerido' })
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  tipo: z.enum(['PRODUCTO', 'SERVICIO']),
});

type CategoriaFormValues = z.infer<typeof categoriaSchema>;

interface CategoriaFormProps {
  categoria?: Categoria | null;
  tipoInicial?: TipoItem;
  onSuccess: () => void;
  onCreate: (data: CrearCategoriaDto) => Promise<Categoria>;
  onUpdate: (id: string, data: ActualizarCategoriaDto) => Promise<Categoria>;
}

export function CategoriaForm({
  categoria,
  tipoInicial = 'PRODUCTO',
  onSuccess,
  onCreate,
  onUpdate,
}: Readonly<CategoriaFormProps>) {
  const form = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: {
      nombre: categoria?.nombre || '',
      tipo: categoria?.tipo || tipoInicial,
    },
  });

  const onSubmit = async (data: CategoriaFormValues) => {
    try {
      const payload = {
        nombre: data.nombre.toUpperCase().trim(),
        tipo: data.tipo,
      };
      if (categoria) {
        await onUpdate(categoria.id, payload);
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
          name="tipo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PRODUCTO">PRODUCTO</SelectItem>
                  <SelectItem value="SERVICIO">SERVICIO</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Define si la categoría agrupa productos físicos o servicios.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ej: MOUSE GAMER / LIMPIEZA DE CABEZAL"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <FormDescription>
                Nombre de la categoría (se guardará en MAYÚSCULAS)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {categoria ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
