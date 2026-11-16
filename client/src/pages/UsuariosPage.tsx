import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  UserPlus,
  Pencil,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Users,
  RefreshCw,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { authService } from '@/services/auth.service';
import {
  usuarioService,
  type UsuarioAdmin,
  type RolGestionable,
} from '@/services/usuario.service';
import type { ApiError } from '@/types';
import { cn } from '@/lib/utils';

const USERNAME_REGEX = /^[a-zA-Z0-9._-]+$/;

function validateNombreCompleto(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length < 2) {
    return 'El nombre completo debe tener al menos 2 caracteres';
  }
  if (trimmed.length > 100) {
    return 'El nombre completo no puede exceder 100 caracteres';
  }
  return undefined;
}

function validateUsername(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length < 3) {
    return 'El username debe tener al menos 3 caracteres';
  }
  if (trimmed.length > 50) {
    return 'El username no puede exceder 50 caracteres';
  }
  if (!USERNAME_REGEX.test(trimmed)) {
    return 'Solo se permiten letras, números, puntos, guiones y guiones bajos';
  }
  return undefined;
}

function validatePassword(value: string): string | undefined {
  if (value.length < 6) {
    return 'La contraseña debe tener al menos 6 caracteres';
  }
  if (value.length > 100) {
    return 'La contraseña no puede exceder 100 caracteres';
  }
  return undefined;
}

function validateConfirmPassword(password: string, confirmPassword: string): string | undefined {
  if (!confirmPassword) {
    return 'Confirma la contraseña';
  }
  if (password !== confirmPassword) {
    return 'Las contraseñas no coinciden';
  }
  return undefined;
}

function extractApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiError>(err)) {
    const data = err.response?.data;
    if (data?.details && data.details.length > 0) {
      return data.details.map((d) => d.mensaje).join('. ');
    }
    if (data?.error) return data.error;
    if (data?.mensaje) return data.mensaje;
    if (err.message) return err.message;
  } else if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

function formatFecha(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function toRolGestionable(rol: string): RolGestionable {
  return rol === 'ADMIN' ? 'ADMIN' : 'VENDEDOR';
}

interface PasswordFieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  autoComplete?: string;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

function PasswordField({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  autoComplete = 'new-password',
  disabled = false,
  inputRef,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label} <span className="text-destructive" aria-hidden="true">*</span>
      </Label>
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          required
          minLength={6}
          maxLength={100}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={cn('pr-10', error && 'border-destructive focus-visible:ring-destructive')}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          aria-pressed={visible}
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
      {error && (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface RolSelectorProps {
  groupName: string;
  value: RolGestionable;
  onChange: (rol: RolGestionable) => void;
  disabled?: boolean;
}

function RolSelector({ groupName, value, onChange, disabled = false }: RolSelectorProps) {
  const options: Array<{ value: RolGestionable; label: string; description: string }> = [
    {
      value: 'ADMIN',
      label: 'ADMIN',
      description: 'Acceso total, backups y gestión de usuarios',
    },
    {
      value: 'VENDEDOR',
      label: 'VENDEDOR',
      description: 'Ventas, inventario y órdenes de servicio',
    },
  ];

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium leading-none">
        Rol <span className="text-destructive" aria-hidden="true">*</span>
      </legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {options.map((opt) => {
          const checked = value === opt.value;
          const radioId = `${groupName}-${opt.value.toLowerCase()}`;
          return (
            <label
              key={opt.value}
              htmlFor={radioId}
              className={cn(
                'flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer transition-colors',
                checked
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border bg-background hover:bg-muted/50 text-muted-foreground',
                disabled && 'opacity-60 cursor-not-allowed'
              )}
            >
              <input
                id={radioId}
                type="radio"
                name={groupName}
                value={opt.value}
                checked={checked}
                onChange={() => onChange(opt.value)}
                disabled={disabled}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <div className="space-y-0.5">
                <span className="block text-sm font-semibold text-foreground">{opt.label}</span>
                <span className="block text-xs text-muted-foreground">{opt.description}</span>
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

interface CreateFormState {
  nombreCompleto: string;
  username: string;
  password: string;
  confirmPassword: string;
  rol: RolGestionable;
}

interface CreateFormErrors {
  nombreCompleto?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
}

interface EditFormState {
  nombreCompleto: string;
  username: string;
  rol: RolGestionable;
}

interface EditFormErrors {
  nombreCompleto?: string;
  username?: string;
}

interface PasswordFormState {
  newPassword: string;
  confirmPassword: string;
}

interface PasswordFormErrors {
  newPassword?: string;
  confirmPassword?: string;
}

const INITIAL_CREATE_FORM: CreateFormState = {
  nombreCompleto: '',
  username: '',
  password: '',
  confirmPassword: '',
  rol: 'ADMIN',
};

const INITIAL_PASSWORD_FORM: PasswordFormState = {
  newPassword: '',
  confirmPassword: '',
};

export function UsuariosPage() {
  const navigate = useNavigate();
  const claims = authService.getTokenClaims();
  const esAdmin = claims?.rol === 'ADMIN';
  const currentUserId = claims?.userId;

  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [loading, setLoading] = useState(esAdmin);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modal: Nuevo Administrador
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(INITIAL_CREATE_FORM);
  const [createErrors, setCreateErrors] = useState<CreateFormErrors>({});
  const [createApiError, setCreateApiError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const createNombreRef = useRef<HTMLInputElement>(null);
  const createUsernameRef = useRef<HTMLInputElement>(null);
  const createPasswordRef = useRef<HTMLInputElement>(null);
  const createConfirmRef = useRef<HTMLInputElement>(null);

  // Modal: Editar Usuario
  const [editingUser, setEditingUser] = useState<UsuarioAdmin | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    nombreCompleto: '',
    username: '',
    rol: 'ADMIN',
  });
  const [editErrors, setEditErrors] = useState<EditFormErrors>({});
  const [editApiError, setEditApiError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const editNombreRef = useRef<HTMLInputElement>(null);
  const editUsernameRef = useRef<HTMLInputElement>(null);

  // Modal: Cambiar / Revocar Contraseña
  const [passwordUser, setPasswordUser] = useState<UsuarioAdmin | null>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(INITIAL_PASSWORD_FORM);
  const [passwordErrors, setPasswordErrors] = useState<PasswordFormErrors>({});
  const [passwordApiError, setPasswordApiError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const resetNewPasswordRef = useRef<HTMLInputElement>(null);
  const resetConfirmPasswordRef = useRef<HTMLInputElement>(null);

  const cargarUsuarios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const lista = await usuarioService.listarAdmin();
      setUsuarios(lista);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'No se pudo cargar la lista de usuarios'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!esAdmin) return;
    void cargarUsuarios();
  }, [esAdmin, cargarUsuarios]);

  if (!esAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full border-destructive/30">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <ShieldAlert className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-lg">Acceso restringido</CardTitle>
                <CardDescription>Permisos insuficientes para esta sección</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            La gestión de usuarios y restablecimiento de contraseñas está reservada exclusivamente
            para cuentas con rol <span className="font-semibold text-foreground">ADMIN</span>.
          </CardContent>
          <CardFooter>
            <Button type="button" variant="outline" onClick={() => navigate('/')} className="w-full">
              Volver al Resumen del Negocio
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const openCreateModal = () => {
    setCreateForm(INITIAL_CREATE_FORM);
    setCreateErrors({});
    setCreateApiError(null);
    setCreateOpen(true);
  };

  const openEditModal = (usuario: UsuarioAdmin) => {
    setEditingUser(usuario);
    setEditForm({
      nombreCompleto: usuario.nombreCompleto,
      username: usuario.username,
      rol: toRolGestionable(usuario.rol),
    });
    setEditErrors({});
    setEditApiError(null);
  };

  const openPasswordModal = (usuario: UsuarioAdmin) => {
    setPasswordUser(usuario);
    setPasswordForm(INITIAL_PASSWORD_FORM);
    setPasswordErrors({});
    setPasswordApiError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateApiError(null);

    const errors: CreateFormErrors = {
      nombreCompleto: validateNombreCompleto(createForm.nombreCompleto),
      username: validateUsername(createForm.username),
      password: validatePassword(createForm.password),
      confirmPassword: validateConfirmPassword(createForm.password, createForm.confirmPassword),
    };
    setCreateErrors(errors);

    if (errors.nombreCompleto) {
      createNombreRef.current?.focus();
      return;
    }
    if (errors.username) {
      createUsernameRef.current?.focus();
      return;
    }
    if (errors.password) {
      createPasswordRef.current?.focus();
      return;
    }
    if (errors.confirmPassword) {
      createConfirmRef.current?.focus();
      return;
    }

    setCreating(true);
    try {
      const creado = await usuarioService.crearAdmin({
        nombreCompleto: createForm.nombreCompleto.trim(),
        username: createForm.username.trim(),
        password: createForm.password,
        rol: createForm.rol,
      });
      setCreateOpen(false);
      setFeedback(`Usuario "${creado.nombreCompleto}" (@${creado.username}) creado con rol ${creado.rol}.`);
      await cargarUsuarios();
    } catch (err: unknown) {
      setCreateApiError(extractApiErrorMessage(err, 'No se pudo crear el usuario'));
    } finally {
      setCreating(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditApiError(null);

    const errors: EditFormErrors = {
      nombreCompleto: validateNombreCompleto(editForm.nombreCompleto),
      username: validateUsername(editForm.username),
    };
    setEditErrors(errors);

    if (errors.nombreCompleto) {
      editNombreRef.current?.focus();
      return;
    }
    if (errors.username) {
      editUsernameRef.current?.focus();
      return;
    }

    setSavingEdit(true);
    try {
      const actualizado = await usuarioService.actualizarAdmin(editingUser.id, {
        nombreCompleto: editForm.nombreCompleto.trim(),
        username: editForm.username.trim(),
        rol: editForm.rol,
      });
      setEditingUser(null);
      setFeedback(`Usuario "${actualizado.nombreCompleto}" (@${actualizado.username}) actualizado.`);
      await cargarUsuarios();
    } catch (err: unknown) {
      setEditApiError(extractApiErrorMessage(err, 'No se pudo actualizar el usuario'));
    } finally {
      setSavingEdit(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUser) return;
    setPasswordApiError(null);

    const errors: PasswordFormErrors = {
      newPassword: validatePassword(passwordForm.newPassword),
      confirmPassword: validateConfirmPassword(
        passwordForm.newPassword,
        passwordForm.confirmPassword
      ),
    };
    setPasswordErrors(errors);

    if (errors.newPassword) {
      resetNewPasswordRef.current?.focus();
      return;
    }
    if (errors.confirmPassword) {
      resetConfirmPasswordRef.current?.focus();
      return;
    }

    setSavingPassword(true);
    try {
      const mensaje = await usuarioService.cambiarPasswordAdmin(
        passwordUser.id,
        passwordForm.newPassword
      );
      const targetLabel = `${passwordUser.nombreCompleto} (@${passwordUser.username})`;
      setPasswordUser(null);
      setFeedback(`${mensaje} para ${targetLabel}.`);
    } catch (err: unknown) {
      setPasswordApiError(extractApiErrorMessage(err, 'No se pudo actualizar la contraseña'));
    } finally {
      setSavingPassword(false);
    }
  };

  const totalAdmins = usuarios.filter((u) => u.rol === 'ADMIN').length;
  const totalVendedores = usuarios.filter((u) => u.rol === 'VENDEDOR').length;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Administra cuentas del taller, crea nuevos administradores y restablece contraseñas olvidadas.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void cargarUsuarios()}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden="true" />
            Actualizar
          </Button>
          <Button type="button" onClick={openCreateModal}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Nuevo Administrador
          </Button>
        </div>
      </div>

      {/* Feedback de éxito */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{feedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Cerrar aviso"
            className="rounded-sm p-1 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Resumen rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" aria-hidden="true" />
              Usuarios activos
            </CardDescription>
            <CardTitle className="text-2xl">{usuarios.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              Administradores
            </CardDescription>
            <CardTitle className="text-2xl">{totalAdmins}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Vendedores / Técnicos
            </CardDescription>
            <CardTitle className="text-2xl">{totalVendedores}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Error de carga */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Error al cargar usuarios</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-1">
            <span>{error}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void cargarUsuarios()}
              className="shrink-0 bg-background text-foreground"
            >
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabla principal */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
              <p className="text-sm">Cargando usuarios del taller...</p>
            </div>
          ) : usuarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-4 text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Users className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">No hay usuarios registrados</p>
                <p className="text-sm text-muted-foreground">
                  Crea una cuenta de administrador o vendedor para comenzar.
                </p>
              </div>
              <Button type="button" onClick={openCreateModal} className="mt-1">
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Nuevo Administrador
              </Button>
            </div>
          ) : (
            <Table>
              <caption className="sr-only">Usuarios registrados en el taller</caption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="pl-6">Nombre completo</TableHead>
                  <TableHead scope="col">Usuario</TableHead>
                  <TableHead scope="col">Rol</TableHead>
                  <TableHead scope="col">Creado</TableHead>
                  <TableHead scope="col" className="text-right pr-6">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((usuario) => {
                  const isCurrentUser = currentUserId === usuario.id;
                  const isAdminRole = usuario.rol === 'ADMIN';
                  return (
                    <TableRow key={usuario.id}>
                      <TableCell className="pl-6 font-medium">
                        <div className="flex items-center gap-2">
                          <span>{usuario.nombreCompleto}</span>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-[11px] font-normal">
                              Sesión actual
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        @{usuario.username}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isAdminRole ? 'default' : 'secondary'}>
                          {usuario.rol}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatFecha(usuario.createdAt)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="inline-flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(usuario)}
                            aria-label={`Editar usuario ${usuario.nombreCompleto}`}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openPasswordModal(usuario)}
                            aria-label={`Cambiar o revocar contraseña de ${usuario.nombreCompleto}`}
                          >
                            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                            Contraseña
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal: Nuevo Administrador */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!creating) setCreateOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Administrador</DialogTitle>
            <DialogDescription>
              Crea una cuenta nueva con contraseña segura para acceder al taller.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} noValidate className="space-y-4">
            {createApiError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>{createApiError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="create-nombre">
                Nombre completo <span className="text-destructive" aria-hidden="true">*</span>
              </Label>
              <Input
                ref={createNombreRef}
                id="create-nombre"
                name="nombreCompleto"
                type="text"
                autoComplete="name"
                placeholder="Ej. María Gómez"
                value={createForm.nombreCompleto}
                onChange={(e) => {
                  const val = e.target.value;
                  setCreateForm((prev) => ({ ...prev, nombreCompleto: val }));
                  if (createErrors.nombreCompleto) {
                    setCreateErrors((prev) => ({
                      ...prev,
                      nombreCompleto: validateNombreCompleto(val),
                    }));
                  }
                }}
                onBlur={() => {
                  if (createForm.nombreCompleto !== '') {
                    setCreateErrors((prev) => ({
                      ...prev,
                      nombreCompleto: validateNombreCompleto(createForm.nombreCompleto),
                    }));
                  }
                }}
                required
                minLength={2}
                maxLength={100}
                disabled={creating}
                aria-invalid={createErrors.nombreCompleto ? 'true' : undefined}
                aria-describedby={createErrors.nombreCompleto ? 'create-nombre-error' : undefined}
                className={cn(
                  createErrors.nombreCompleto && 'border-destructive focus-visible:ring-destructive'
                )}
              />
              {createErrors.nombreCompleto && (
                <p id="create-nombre-error" className="text-xs text-destructive" role="alert">
                  {createErrors.nombreCompleto}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-username">
                Username <span className="text-destructive" aria-hidden="true">*</span>
              </Label>
              <p id="create-username-hint" className="text-xs text-muted-foreground">
                Mínimo 3 caracteres: letras, números, puntos, guiones o guiones bajos.
              </p>
              <Input
                ref={createUsernameRef}
                id="create-username"
                name="username"
                type="text"
                autoComplete="username"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Ej. admin.maria"
                value={createForm.username}
                onChange={(e) => {
                  const val = e.target.value;
                  setCreateForm((prev) => ({ ...prev, username: val }));
                  if (createErrors.username) {
                    setCreateErrors((prev) => ({ ...prev, username: validateUsername(val) }));
                  }
                }}
                onBlur={() => {
                  if (createForm.username !== '') {
                    setCreateErrors((prev) => ({
                      ...prev,
                      username: validateUsername(createForm.username),
                    }));
                  }
                }}
                required
                minLength={3}
                maxLength={50}
                disabled={creating}
                aria-invalid={createErrors.username ? 'true' : undefined}
                aria-describedby={
                  createErrors.username
                    ? 'create-username-hint create-username-error'
                    : 'create-username-hint'
                }
                className={cn(
                  createErrors.username && 'border-destructive focus-visible:ring-destructive'
                )}
              />
              {createErrors.username && (
                <p id="create-username-error" className="text-xs text-destructive" role="alert">
                  {createErrors.username}
                </p>
              )}
            </div>

            <RolSelector
              groupName="create-rol"
              value={createForm.rol}
              onChange={(rol) => setCreateForm((prev) => ({ ...prev, rol }))}
              disabled={creating}
            />

            <PasswordField
              id="create-password"
              name="password"
              label="Contraseña"
              hint="Mínimo 6 caracteres."
              value={createForm.password}
              onChange={(val) => {
                setCreateForm((prev) => ({ ...prev, password: val }));
                if (createErrors.password || createErrors.confirmPassword) {
                  setCreateErrors((prev) => ({
                    ...prev,
                    password: prev.password ? validatePassword(val) : undefined,
                    confirmPassword: prev.confirmPassword
                      ? validateConfirmPassword(val, createForm.confirmPassword)
                      : undefined,
                  }));
                }
              }}
              onBlur={() => {
                if (createForm.password !== '') {
                  setCreateErrors((prev) => ({
                    ...prev,
                    password: validatePassword(createForm.password),
                  }));
                }
              }}
              error={createErrors.password}
              disabled={creating}
              inputRef={createPasswordRef}
            />

            <PasswordField
              id="create-confirm-password"
              name="confirmPassword"
              label="Confirmar contraseña"
              value={createForm.confirmPassword}
              onChange={(val) => {
                setCreateForm((prev) => ({ ...prev, confirmPassword: val }));
                if (createErrors.confirmPassword) {
                  setCreateErrors((prev) => ({
                    ...prev,
                    confirmPassword: validateConfirmPassword(createForm.password, val),
                  }));
                }
              }}
              onBlur={() => {
                if (createForm.confirmPassword !== '') {
                  setCreateErrors((prev) => ({
                    ...prev,
                    confirmPassword: validateConfirmPassword(
                      createForm.password,
                      createForm.confirmPassword
                    ),
                  }));
                }
              }}
              error={createErrors.confirmPassword}
              disabled={creating}
              inputRef={createConfirmRef}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {creating ? 'Creando...' : 'Crear usuario'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Usuario */}
      <Dialog
        open={editingUser !== null}
        onOpenChange={(open) => {
          if (!open && !savingEdit) setEditingUser(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica los datos de acceso o rol de{' '}
              <span className="font-medium text-foreground">
                {editingUser?.nombreCompleto}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} noValidate className="space-y-4">
            {editApiError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>{editApiError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="edit-nombre">
                Nombre completo <span className="text-destructive" aria-hidden="true">*</span>
              </Label>
              <Input
                ref={editNombreRef}
                id="edit-nombre"
                name="nombreCompleto"
                type="text"
                autoComplete="name"
                value={editForm.nombreCompleto}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditForm((prev) => ({ ...prev, nombreCompleto: val }));
                  if (editErrors.nombreCompleto) {
                    setEditErrors((prev) => ({
                      ...prev,
                      nombreCompleto: validateNombreCompleto(val),
                    }));
                  }
                }}
                onBlur={() => {
                  setEditErrors((prev) => ({
                    ...prev,
                    nombreCompleto: validateNombreCompleto(editForm.nombreCompleto),
                  }));
                }}
                required
                minLength={2}
                maxLength={100}
                disabled={savingEdit}
                aria-invalid={editErrors.nombreCompleto ? 'true' : undefined}
                aria-describedby={editErrors.nombreCompleto ? 'edit-nombre-error' : undefined}
                className={cn(
                  editErrors.nombreCompleto && 'border-destructive focus-visible:ring-destructive'
                )}
              />
              {editErrors.nombreCompleto && (
                <p id="edit-nombre-error" className="text-xs text-destructive" role="alert">
                  {editErrors.nombreCompleto}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-username">
                Username <span className="text-destructive" aria-hidden="true">*</span>
              </Label>
              <p id="edit-username-hint" className="text-xs text-muted-foreground">
                Mínimo 3 caracteres: letras, números, puntos, guiones o guiones bajos.
              </p>
              <Input
                ref={editUsernameRef}
                id="edit-username"
                name="username"
                type="text"
                autoComplete="username"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={editForm.username}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditForm((prev) => ({ ...prev, username: val }));
                  if (editErrors.username) {
                    setEditErrors((prev) => ({ ...prev, username: validateUsername(val) }));
                  }
                }}
                onBlur={() => {
                  setEditErrors((prev) => ({
                    ...prev,
                    username: validateUsername(editForm.username),
                  }));
                }}
                required
                minLength={3}
                maxLength={50}
                disabled={savingEdit}
                aria-invalid={editErrors.username ? 'true' : undefined}
                aria-describedby={
                  editErrors.username
                    ? 'edit-username-hint edit-username-error'
                    : 'edit-username-hint'
                }
                className={cn(
                  editErrors.username && 'border-destructive focus-visible:ring-destructive'
                )}
              />
              {editErrors.username && (
                <p id="edit-username-error" className="text-xs text-destructive" role="alert">
                  {editErrors.username}
                </p>
              )}
            </div>

            <RolSelector
              groupName="edit-rol"
              value={editForm.rol}
              onChange={(rol) => setEditForm((prev) => ({ ...prev, rol }))}
              disabled={savingEdit}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingUser(null)}
                disabled={savingEdit}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={savingEdit}>
                {savingEdit && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {savingEdit ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Cambiar / Revocar Contraseña */}
      <Dialog
        open={passwordUser !== null}
        onOpenChange={(open) => {
          if (!open && !savingPassword) setPasswordUser(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar / Revocar Contraseña</DialogTitle>
            <DialogDescription>
              Asigna una nueva contraseña para{' '}
              <span className="font-medium text-foreground">
                {passwordUser?.nombreCompleto}
              </span>{' '}
              (<span className="font-mono">@{passwordUser?.username}</span>). La contraseña anterior
              dejará de funcionar de inmediato.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePasswordSubmit} noValidate className="space-y-4">
            {passwordApiError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>{passwordApiError}</AlertDescription>
              </Alert>
            )}

            <PasswordField
              id="reset-new-password"
              name="newPassword"
              label="Nueva contraseña"
              hint="Mínimo 6 caracteres."
              value={passwordForm.newPassword}
              onChange={(val) => {
                setPasswordForm((prev) => ({ ...prev, newPassword: val }));
                if (passwordErrors.newPassword || passwordErrors.confirmPassword) {
                  setPasswordErrors((prev) => ({
                    ...prev,
                    newPassword: prev.newPassword ? validatePassword(val) : undefined,
                    confirmPassword: prev.confirmPassword
                      ? validateConfirmPassword(val, passwordForm.confirmPassword)
                      : undefined,
                  }));
                }
              }}
              onBlur={() => {
                if (passwordForm.newPassword !== '') {
                  setPasswordErrors((prev) => ({
                    ...prev,
                    newPassword: validatePassword(passwordForm.newPassword),
                  }));
                }
              }}
              error={passwordErrors.newPassword}
              disabled={savingPassword}
              inputRef={resetNewPasswordRef}
            />

            <PasswordField
              id="reset-confirm-password"
              name="confirmPassword"
              label="Confirmar nueva contraseña"
              value={passwordForm.confirmPassword}
              onChange={(val) => {
                setPasswordForm((prev) => ({ ...prev, confirmPassword: val }));
                if (passwordErrors.confirmPassword) {
                  setPasswordErrors((prev) => ({
                    ...prev,
                    confirmPassword: validateConfirmPassword(passwordForm.newPassword, val),
                  }));
                }
              }}
              onBlur={() => {
                if (passwordForm.confirmPassword !== '') {
                  setPasswordErrors((prev) => ({
                    ...prev,
                    confirmPassword: validateConfirmPassword(
                      passwordForm.newPassword,
                      passwordForm.confirmPassword
                    ),
                  }));
                }
              }}
              error={passwordErrors.confirmPassword}
              disabled={savingPassword}
              inputRef={resetConfirmPasswordRef}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordUser(null)}
                disabled={savingPassword}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={savingPassword}>
                {savingPassword && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {savingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
