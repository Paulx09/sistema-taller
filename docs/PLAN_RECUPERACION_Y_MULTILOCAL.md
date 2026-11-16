# Plan de Recuperación en Supabase, Multi-Local y Gestión de Usuarios

> **Proyecto:** `sistema-taller` (conectado a Supabase `ehzuznryngknijwcgjwq`, compartido con `aypcs-website`)  
> **Rama de trabajo:** `feat/supabase-recovery-multilocal`  
> **Fecha de creación:** 2026-11-16

---

## 1. Contexto y Reglas de Seguridad

1. **No modificar el backup original:** El archivo `Github\aypcs-website\docs\backup_taller_2026-10-30_17-29*` es de solo lectura. Nunca se editará ni sobrescribirá.
2. **Proteger `aypcs-website`:** No usar `prisma migrate reset` ni `prisma db push` sobre Supabase. Preservar sus 7 tablas (`sedes_courier`, `ordenes_web`, `detalle_ordenes_web`, `reservas_stock`, `comprobantes_pago_manual`, `webhook_logs`, `consultas_documentos_cache`), sus 6 enums, la secuencia `ordenes_web_seq`, las 3 funciones RPC (`fn_crear_orden_con_reserva`, `fn_liberar_reservas_expiradas`, `fn_asentar_venta_web_en_taller`), políticas RLS y el usuario bot `tienda_web`.
3. **Decisiones de negocio confirmadas:**
   - **2 locales físicos:** `Tienda Copacabana` y `Cielo Plaza`.
   - **Inventario:** Stock único compartido (`productos.stock_actual` global).
   - **Alcance por local:** `Ventas` y `OrdenServicio` registran el local. `Compras` sigue global.
   - **Histórico del backup:** Todas las ventas y órdenes de servicio restauradas se asignan inicialmente a **Tienda Copacabana**.
   - **Métricas:** Enfoque **mensual** (comparativa Copacabana vs. Cielo Plaza, y Tienda Web aparte), sin módulo de gastos operativos.
   - **Usuarios:** 3 usuarios con rol `ADMIN`, contraseñas hasheadas con `bcrypt`, con capacidad de que otro usuario `ADMIN` restablezca/cambie la contraseña en caso de olvido. Los usuarios eligen libremente en qué local están operando.

---

## 2. Fases de Ejecución y Seguimiento

### Bloque A — Estabilización de Supabase y Restauración del Backup Real
- [x] **A1. Migración SQL aditiva en Supabase** *(Migración `sistema_taller_complete_schema_and_locales` aplicada; 28 tablas verificadas en `public`, `locales` poblada con `COPACABANA` y `CIELO_PLAZA`)*
  - Crear las 9 tablas faltantes: `compras`, `detalle_compras`, `historial_costos`, `producto_series`, `equipos_cliente`, `ordenes_servicio`, `equipos_orden`, `items_orden`, `notas_tecnicas`.
  - Crear tabla `locales` con registros iniciales: `Tienda Copacabana` (`COPACABANA`) y `Cielo Plaza` (`CIELO_PLAZA`).
  - Agregar columna `local_id` (nullable + FK a `locales(id)`) en `ventas` y `ordenes_servicio` para compatibilidad con `fn_asentar_venta_web_en_taller`.
  - Agregar FKs pendientes en `movimientos_stock` (`compra_id`, `orden_servicio_id`).
- [x] **A2. Revisión de entorno (`server/.env` y bootstrap)** *(Codificado `%40` en `DATABASE_URL`, validado con `new URL(...)`, agregado `AUTO_DB_BOOTSTRAP=false`)*
  - Codificar `%40` en la contraseña de `DATABASE_URL`.
  - Controlar `AUTO_DB_BOOTSTRAP=false` en entornos conectados a Supabase compartido.
- [x] **A3. Restauración segura de `backup_taller_2026-10-30_17-29`** *(Restaurado sin modificar el archivo original: 144 productos, 62 categorías, 96 ventas, 1 orden de servicio, 124 historial_costos, 241 movimientos_stock; preservados 29 sedes_courier y usuario bot `tienda_web`; ventas/OS históricas asignadas a `Tienda Copacabana`; índice único `productos_codigo_barras_key` agregado)*
  - Limpiar únicamente datos de prueba en tablas del taller (preservando `tienda_web`, `locales` y todo `ecommerce_schema`).
  - Importar solo los datos del backup en orden de dependencias.
  - Asignar `local_id = Tienda Copacabana` a todo el histórico de `ventas` y `ordenes_servicio`.

### Bloque B — Multi-Local (Copacabana / Cielo Plaza) y Rendimiento Mensual
- [x] **B1. Backend Multi-Local (`server/`)** *(Completado en TASK-03: modelo `Local`, `GET /api/locales`, `localId` requerido al crear en `ventas` y `ordenes-servicio`, filtro `localId` incluyendo `WEB`, `resumenMensual` y `rendimientoPorLocal` en `GET /api/dashboard/metricas`; `prisma generate` y `npm run build` OK)*
  - Actualizar `schema.prisma` (`Local`, relaciones en `Venta` y `OrdenServicio`).
  - Crear endpoint `GET /api/locales`.
  - Exigir `localId` al crear ventas y órdenes desde el taller, filtrar por `localId` (y `WEB` para `localId IS NULL`) e incluir `local` en respuestas.
  - Actualizar `dashboard.service.ts` para métricas **mensuales** (`mes`, `anio`, rango personalizado, filtro `localId`) y comparativa **Copacabana vs. Cielo Plaza** (+ Tienda Web).
- [x] **B2. Frontend Multi-Local + Fixes UI/Errores (`client/`)** *(Completado en TASK-05: `LocalProvider`, selector en `MainLayout.tsx`, Dashboard mensual con comparativa por tienda, `VentasPage`/`OrdenesServicioPage`/`PDFs` multi-local, `.catch()` visibles y fix CSS `min-w-0`/drawer)*
  - Selector de local activo en `MainLayout.tsx` (persistido en `localStorage`) y corrección del recorte visual izquierdo del sidebar.
  - Integrar selector y badges de local en `VentasPage`, `OrdenesServicioPage`, `OrdenServicioDetalle`, `VentaPDF` y `OrdenServicioPDF`.
  - Rediseñar `Dashboard.tsx` con selector mensual (Mes/Año) y tarjetas/tabla comparativa Copacabana vs. Cielo Plaza.
  - Eliminar fallback silencioso de ceros en `dashboard.service.ts`, añadir `.catch()` en `VentasPage.tsx` y `ComprasPage.tsx`, y corregir log `[object Object]` en `api.ts`.

### Bloque C — Gestión de Usuarios ADMIN
- [x] **C1. Backend Usuarios (`server/`)** *(Completado en TASK-04: `requireAdmin`, `rol != 'SISTEMA'` en `authService.login` y `listarUsuarios`, `/api/usuarios` `GET/POST/PATCH /:id/PATCH /:id/password` con Zod y `bcrypt`; `npm run build` OK)*
  - Excluir `rol = 'SISTEMA'` (`tienda_web`) en `authService.listarUsuarios()`.
  - Middleware `requireAdmin` + endpoints `/api/usuarios` (`GET`, `POST`, `PATCH /:id`, `PATCH /:id/password`) con validación Zod y hash `bcrypt`.
- [ ] **C2. Frontend Usuarios (`client/`)**
  - Ruta `/usuarios` y enlace en sidebar para `ADMIN`.
  - Listado, creación de administradores y modal para cambiar/revocar contraseña de otro usuario en caso de olvido.

### Bloque D — Verificación Integral
- [ ] **D1.** `npm run build` en `server/` y `client/` + `npm run lint` en `client/`.
- [ ] **D2.** Revisión con `/browser` de todas las secciones del sidebar (`Dashboard`, `Ventas`, `Compras`, `Inventario`, `Proveedores`, `Órdenes Servicio`, `Clientes`, `Verificar Garantía`, `Usuarios`) con HTTP 200 y 0 errores de consola.
- [ ] **D3.** Verificación de `aypcs-website` (`localhost:4321`) operativo sin regresiones.
