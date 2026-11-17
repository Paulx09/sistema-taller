# Feature: Optimización de Rendimiento en Sistema Taller (Backend, Supabase y Frontend)

## Metadata
- **Feature Name:** `sistema-taller-performance`
- **Topic Key Engram:** `odd/sistema-taller-performance/tasks`
- **Rama Git:** `feat/supabase-recovery-multilocal`
- **Estrategia de Entrega:** `ask-on-risk`
- **Líneas estimadas:** ~480 (SQL + server + client)
- **TDD Mode:** `off` (fuente: `server/package.json` y `client/package.json` sin runner de tests unitarios; verificación mediante `npm --prefix server run build`, `npm --prefix client run build`, `EXPLAIN`/índices en Supabase, logs SQL de Prisma y pruebas en vivo con `/browser`)
- **RDD Mode:** `off / unavailable in sandbox` (`gentle-ai review mode status` reportó `off` con error de lectura en `state.json` dentro del sandbox)

## Objective & Scope
Reducir drásticamente los tiempos de carga iniciales y de navegación entre pantallas en `sistema-taller` (especialmente Compras, Dashboard, Ventas y Órdenes de Servicio) mediante 3 fases verificables con commits por fase:
1. **Fase 1 (Infraestructura Backend, Auth Caché e Índices Supabase):** eliminar la consulta `SELECT usuarios` repetida en cada request HTTP (`requireAuth` con caché TTL e invalidación), añadir `compression` en Express, ajustar pool/logging en Prisma (`PRISMA_LOG_QUERIES`), y crear índices compuestos/parciales/trigram en Supabase.
2. **Fase 2 (Optimización SQL y Payloads en Servicios Backend):** consolidar las 14 queries del Dashboard en consultas SQL agregadas, optimizar `obtenerSinMovimiento` (`LIMIT 10` en SQL), agregar modo ligero para listados de productos en POS/Compras (y soportar `limit` en `producto.controller.ts`), y mover búsqueda de cliente/código en Historial Completo de Ventas al backend SQL.
3. **Fase 3 (`@tanstack/react-query` y Carga Diferida en Frontend):** integrar `QueryClientProvider` en `client/`, migrar hooks/páginas (`LocalContext`, `useDashboard`, `VentasPage`, `ComprasPage`, `ProductosPage`, `OrdenesServicioPage`, `ClientesPage`), eliminar el debounce inicial de 300 ms en `Nueva Venta` y diferir catálogos de modales (`enabled: modalOpen`).

## Constraints
- **NO modificar** los archivos del feature UI previo sin commit (`client/src/pages/Dashboard.tsx`, `client/src/pages/VentasPage.tsx`, `odd/tasks/frontend-pos-dashboard-fixes.md`) durante la Fase 1 ni incluirlos en los commits de fases de rendimiento (salvo en Fase 3 cuando se integre React Query en `client/`, revisando explícitamente el staging con el usuario si siguen sin commit).
- **NO ejecutar** `prisma migrate reset` ni `prisma db push` contra Supabase; usar migraciones aditivas vía Supabase (`apply_migration`).
- Preservar intacta la compatibilidad con `aypcs-website` (`ordenes_web`, `reservas_stock`, RPCs y usuario bot `tienda_web`).

## Checklist de Tareas

- [x] **FASE-1** `[route: delegated]` — Infraestructura Backend, Auth Caché e Índices Supabase (`auth.middleware.ts`, `usuario.service.ts`, `index.ts`, `database.ts`, `server/.env`, `schema.prisma`, migración Supabase `add_sistema_taller_performance_indexes`).
  - *Acceptance:* `requireAuth` resuelve usuarios desde caché TTL (invalidada al editar/eliminar/cambiar password), Express sirve respuestas comprimidas (`compression`), `PRISMA_LOG_QUERIES` controla el log de SQL en dev, `connection_limit=15` en `.env`, y los 24 índices nuevos verificados en `pg_indexes`.
  - *Checks:* `npm --prefix server run generate` (exit 0), `npm --prefix server run build` (exit 0), `prisma validate` (exit 0), `pg_indexes` (24 índices `idx_*` nuevos en Supabase), `/browser` smoke check OK (`0` errores HTTP en Dashboard, Compras ~7.5s, Ventas Nueva Venta ~4.4s, Historial ~11.3s — cuello pendiente de Fase 2 y Fase 3).
- [ ] **FASE-2** `[route: delegated]` — Optimización SQL y Payloads en Servicios Backend (`dashboard.service.ts`, `producto.service.ts`, `producto.controller.ts`, `venta.service.ts`, `venta.controller.ts`).
  - *Acceptance:* `dashboard.service.ts` ejecuta <= 3 consultas SQL agregadas para métricas + `LIMIT 10` SQL en `obtenerSinMovimiento`; `GET /productos` soporta `limit`/`take` y modo ligero sin `historialCostos`/relaciones pesadas; `GET /ventas` filtra `busqueda` en SQL.
  - *Checks:* `npm --prefix server run build`, comparación de cantidad de queries en log del servidor y validación funcional en `/browser`.
- [ ] **FASE-3** `[route: delegated]` — `@tanstack/react-query` + Carga Diferida en Frontend (`client/package.json`, `main.tsx`/`App.tsx`, hooks y páginas principales).
  - *Acceptance:* Cambio entre pestañas instantáneo desde caché; invalidación automática tras mutaciones; sin debounce inicial de 300 ms en POS; catálogos de modales cargan bajo demanda (`enabled`).
  - *Checks:* `npm --prefix client run build`, ESLint en archivos modificados, recorrido cronometrado en `/browser` de las 6 pantallas.

## Progress & Evidence
- Documento creado antes de la primera edición en fuente.
- Iniciando FASE-1.
