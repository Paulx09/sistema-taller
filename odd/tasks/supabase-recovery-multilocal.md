# Feature: Supabase Recovery, Multi-Local (Copacabana / Cielo Plaza) y Usuarios Admin

## Metadata
- **Feature Name:** `supabase-recovery-multilocal`
- **Topic Key Engram:** `odd/supabase-recovery-multilocal/tasks`
- **Rama Git:** `feat/supabase-recovery-multilocal`
- **Estrategia de Entrega:** `ask-on-risk`
- **Líneas estimadas:** ~1,200 (SQL + server + client + docs)
- **Líneas acumuladas en rama:** ~787 (commits `a2fd1ac`, `57e4172`, `2d2a13e`)
- **TDD Mode:** `off` (fuente: `server/package.json` y `client/package.json` sin runner de tests unitarios; verificación funcional mediante `tsc`/`vite build`, `eslint`, consultas SQL en Supabase y pruebas E2E con `/browser`)
- **RDD Mode:** `off / unavailable in sandbox` (`gentle-ai review mode status` reportó `off` con error de lectura en `state.json` dentro del sandbox)

## Objective & Scope
1. Reparar la base de datos en Supabase (`ehzuznryngknijwcgjwq`) creando las 9 tablas faltantes de `sistema-taller` sin afectar las tablas, funciones RPC ni políticas RLS de `aypcs-website`.
2. Restaurar de forma segura los datos reales desde `Github\aypcs-website\docs\backup_taller_2026-10-30_17-29*` (sin modificar el archivo original) y asignar el histórico de ventas y órdenes de servicio a **Tienda Copacabana**.
3. Implementar soporte multi-local (**Tienda Copacabana** y **Cielo Plaza**) con **stock único compartido**, selector de local para los usuarios al operar, e informe comparativo de **rendimiento mensual** en Dashboard, Ventas, Órdenes de Servicio y PDFs.
4. Implementar gestión de **usuarios ADMIN** (crear 3 administradores con contraseña hasheada `bcrypt` y capacidad de que otro ADMIN revoque/cambie contraseña si alguien la olvida), filtrando el usuario bot `tienda_web` de los selectores del taller.
5. Corregir manejo de errores silenciosos/no capturados en frontend y el recorte visual izquierdo del sidebar.

## Constraints
- **NO modificar** el archivo original del backup en `Github\aypcs-website\docs\`.
- **NO ejecutar** `prisma migrate reset` ni `prisma db push` contra Supabase.
- **NO romper** `aypcs-website` (`ordenes_web`, `reservas_stock`, `fn_crear_orden_con_reserva`, `fn_asentar_venta_web_en_taller`, `fn_liberar_reservas_expiradas`, políticas RLS públicas y usuario bot `tienda_web`).
- **Stock único compartido**: `productos.stock_actual` sigue siendo global.
- **Métricas mensuales**: priorizar selector Mes/Año y comparativa Copacabana vs. Cielo Plaza (y Tienda Web separado).

## Checklist de Tareas

- [x] **TASK-01** `[route: inline]` — Documentación en `docs/PLAN_RECUPERACION_Y_MULTILOCAL.md` + Migración SQL aditiva en Supabase (9 tablas faltantes, tabla `locales` con Copacabana y Cielo Plaza, `local_id` nullable en `ventas` y `ordenes_servicio`, FKs pendientes en `movimientos_stock`) + revisión de `server/.env`.
  - *Acceptance:* Todas las tablas existen en Supabase, `locales` tiene 2 sedes activas, `aypcs-website` intacto.
  - *Checks:* `information_schema.tables` (28 tablas en `public`), `public.locales` (`COPACABANA`, `CIELO_PLAZA`), `new URL(DATABASE_URL)` OK con `AUTO_DB_BOOTSTRAP=false`.
- [x] **TASK-02** `[route: inline]` — Restauración segura del backup real (`backup_taller_2026-10-30_17-29`) sin modificar el archivo original y backfill de histórico a **Tienda Copacabana**.
  - *Acceptance:* Datos reales restaurados, bot `tienda_web` preservado, ventas/OS históricas asignadas a `Tienda Copacabana`.
  - *Checks:* `productos=144`, `categorias=62`, `ventas=96` (`ventas_con_local=96`), `ordenes_servicio=1` (`os_con_local=1`), `usuarios=2` (`admin` + `tienda_web`), `sedes_courier=29`, `productos_codigo_barras_key` creado.
- [x] **TASK-03** `[route: delegated]` — Backend Multi-Local y Métricas Mensuales (`schema.prisma`, `/api/locales`, `/api/ventas`, `/api/ordenes-servicio`, `/api/dashboard/metricas` con filtro `localId` y `mes`/`anio` + comparativa por tienda).
  - *Acceptance:* `prisma generate` y `npm run build` en `server/` pasan; API crea y filtra por local y calcula rendimiento mensual por local.
  - *Checks:* `cd server && npx prisma generate && npm run build` (exit 0).
- [x] **TASK-04** `[route: delegated]` — Backend Gestión de Usuarios ADMIN (`GET/POST /api/usuarios`, `PATCH /api/usuarios/:id/password`, `PATCH /api/usuarios/:id`, `requireAdmin`, `bcrypt`, filtro `rol != 'SISTEMA'` en `/api/auth/usuarios` y `login`).
  - *Acceptance:* Solo ADMIN puede crear/editar/cambiar contraseñas; contraseñas siempre con `bcrypt`; `tienda_web` excluido de listados de taller.
  - *Checks:* `cd server && npm run build` (exit 0).
- [ ] **TASK-05** `[route: delegated]` — Frontend Multi-Local, Dashboard Mensual y Fixes de Sidebar/Errores (`MainLayout.tsx`, selector de local activo, `Dashboard.tsx`, `VentasPage.tsx`, `ComprasPage.tsx`, `OrdenesServicioPage.tsx`, `OrdenServicioDetalle.tsx`, `VentaPDF.tsx`, `OrdenServicioPDF.tsx`, `api.ts`).
  - *Acceptance:* El usuario cambia de local fácilmente, crea ventas/OS asociadas al local elegido, ve comparativa mensual Copacabana vs. Cielo Plaza, no hay errores silenciosos ni recorte del sidebar.
  - *Checks:* `cd client && npm run build && npm run lint`.
- [ ] **TASK-06** `[route: delegated]` — Frontend Gestión de Usuarios (`/usuarios` solo ADMIN) + Verificación E2E completa con `/browser` en todas las secciones de `sistema-taller` y verificación de `aypcs-website`.
  - *Acceptance:* Todas las secciones del sidebar (excepto Cerrar Sesión y Copia de Seguridad) cargan con HTTP 200 y sin errores en consola; flujo usuarios ADMIN operativo; `aypcs-website` operativo.
  - *Checks:* `npm run build` (server y client), `npm run lint` (client), recorrido `/browser`.

## Progress & Evidence
- Rama creada: `feat/supabase-recovery-multilocal`.
- **TASK-01** completada — Commit `a2fd1ac` (`docs: add Supabase recovery and multi-local plan`).
  - Migración `sistema_taller_complete_schema_and_locales` aplicada en Supabase (`ehzuznryngknijwcgjwq`).
  - `server/.env` actualizado (`%40` en `DATABASE_URL` y `AUTO_DB_BOOTSTRAP=false`).
- **TASK-02** completada — Commit `57e4172` (`docs: record TASK-02 backup restoration and Copacabana backfill`).
  - Backup real restaurado en Supabase sin modificar el original (`144` productos, `62` categorías, `96` ventas, `1` orden de servicio, `124` historial_costos, `241` movimientos_stock; `29` sedes_courier y `tienda_web` preservados).
  - Índice único `productos_codigo_barras_key` aplicado en Supabase (`add_productos_codigo_barras_unique`).
- **TASK-03** completada — Commit `2d2a13e` (`feat(server): add multi-local support and monthly store performance metrics`).
  - `schema.prisma`, `/api/locales`, `/api/ventas` y `/api/ordenes-servicio` con `localId`, `/api/dashboard/metricas` con `resumenMensual` y `rendimientoPorLocal`.
  - `npx prisma generate` y `npm run build` en `server/` exit 0.
- Próximo paso: Delegar TASK-04 (Backend Gestión de Usuarios ADMIN) a worker `self`.
