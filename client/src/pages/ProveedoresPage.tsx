import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Pencil, Trash2, Loader2, Search, Building2, Phone, FileText } from 'lucide-react';
import { listarProveedores, crearProveedor, actualizarProveedor, eliminarProveedor } from '@/services/proveedor.service';
import type { Proveedor, CrearProveedorDto } from '@/types';

export function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [total, setTotal] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CrearProveedorDto>({
    nombreEmpresa: '',
    ruc: '',
    contactoNombre: '',
    telefono: '',
    email: '',
    direccion: '',
  });

  const cargarProveedores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listarProveedores({
        busqueda: busqueda || undefined,
        limit: 100,
      });
      setProveedores(response.data || []);
      setTotal(response.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  }, [busqueda]);

  useEffect(() => {
    cargarProveedores();
  }, [cargarProveedores]);

  const handleCreate = () => {
    setEditingProveedor(null);
    setFormData({
      nombreEmpresa: '',
      ruc: '',
      contactoNombre: '',
      telefono: '',
      email: '',
      direccion: '',
    });
    setSheetOpen(true);
  };

  const handleEdit = (proveedor: Proveedor) => {
    setEditingProveedor(proveedor);
    setFormData({
      nombreEmpresa: proveedor.nombreEmpresa,
      ruc: proveedor.ruc || '',
      contactoNombre: proveedor.contactoNombre || '',
      telefono: proveedor.telefono || '',
      email: proveedor.email || '',
      direccion: proveedor.direccion || '',
    });
    setSheetOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Validación de teléfono peruano (9 dígitos)
    if (formData.telefono && formData.telefono.trim() !== '') {
      const telefonoLimpio = formData.telefono.replace(/\s/g, '');
      if (telefonoLimpio.length !== 9 || !/^\d{9}$/.test(telefonoLimpio)) {
        setError('El teléfono debe tener exactamente 9 dígitos');
        setSubmitting(false);
        return;
      }
    }

    // Validación de RUC (11 dígitos si se proporciona)
    if (formData.ruc && formData.ruc.trim() !== '') {
      const rucLimpio = formData.ruc.replace(/\s/g, '');
      if (rucLimpio.length !== 11 || !/^\d{11}$/.test(rucLimpio)) {
        setError('El RUC debe tener exactamente 11 dígitos');
        setSubmitting(false);
        return;
      }
    }

    try {
      // Convertir strings vacíos a undefined para que el backend los maneje como NULL
      const dataToSend = {
        nombreEmpresa: formData.nombreEmpresa,
        ruc: formData.ruc?.trim() || undefined,
        contactoNombre: formData.contactoNombre?.trim() || undefined,
        telefono: formData.telefono?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        direccion: formData.direccion?.trim() || undefined,
      };

      if (editingProveedor) {
        await actualizarProveedor(editingProveedor.id, dataToSend);
      } else {
        await crearProveedor(dataToSend);
      }
      setSheetOpen(false);
      cargarProveedores();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar proveedor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSubmitting(true);
    setError(null);
    try {
      await eliminarProveedor(id);
      setDeleteConfirmId(null);
      cargarProveedores();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al eliminar proveedor');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Proveedores</h2>
          <p className="text-muted-foreground text-sm mt-1">Gestione su lista de socios comerciales.</p>
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button onClick={handleCreate} className="font-bold shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Proveedor
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader className="border-b pb-4">
              <SheetTitle className="text-xl font-bold">
                {editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </SheetTitle>
              <SheetDescription>
                Ingrese la información del proveedor. Los campos con * son obligatorios.
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleSubmit} className="space-y-6 mt-6">
              {/* Datos Fiscales */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b pb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Datos Fiscales
                </h3>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Razón Social <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    value={formData.nombreEmpresa}
                    onChange={(e) => setFormData({ ...formData, nombreEmpresa: e.target.value })}
                    placeholder="Ej: Distribuidora Tech SAC"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">RUC</label>
                  <Input
                    value={formData.ruc}
                    onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                    placeholder="20123456789"
                    maxLength={11}
                  />
                  <p className="text-xs text-muted-foreground">11 dígitos numéricos (opcional)</p>
                </div>
              </div>

              {/* Información de Contacto */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b pb-2 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Información de Contacto
                </h3>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Nombre de Contacto</label>
                  <Input
                    value={formData.contactoNombre}
                    onChange={(e) => setFormData({ ...formData, contactoNombre: e.target.value })}
                    placeholder="Ej: Juan Pérez"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Teléfono</label>
                    <Input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      placeholder="999 888 777"
                      maxLength={9}
                    />
                    <p className="text-xs text-muted-foreground">9 dígitos (opcional)</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contacto@empresa.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Dirección</label>
                  <Input
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    placeholder="Av. Principal 123, Lima"
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Acciones */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSheetOpen(false)}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingProveedor ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* Búsqueda */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, RUC o contacto..."
            className="pl-9"
          />
        </div>
        <Badge variant="outline" className="h-10 px-4 flex items-center">
          Total: {total}
        </Badge>
      </div>

      {/* Error global */}
      {error && !sheetOpen && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabla */}
      <div className="flex-1 border rounded-lg bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-60">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : proveedores.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
            <Building2 className="h-12 w-12 mb-3 opacity-20" />
            <p className="font-medium">No hay proveedores registrados</p>
            <p className="text-sm">Crea tu primer proveedor para comenzar</p>
          </div>
        ) : (
          <div className="overflow-auto h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>RUC</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Compras</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proveedores.map((proveedor) => (
                  <TableRow key={proveedor.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {proveedor.nombreEmpresa}
                      </div>
                    </TableCell>
                    <TableCell>
                      {proveedor.ruc ? (
                        <Badge variant="outline" className="font-mono text-xs">
                          {proveedor.ruc}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {proveedor.contactoNombre || (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {proveedor.telefono || (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        <FileText className="h-3 w-3 mr-1" />
                        {proveedor._count?.compras || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {deleteConfirmId === proveedor.id ? (
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(proveedor.id)}
                            disabled={submitting}
                          >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteConfirmId(null)}
                            disabled={submitting}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(proveedor)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteConfirmId(proveedor.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
