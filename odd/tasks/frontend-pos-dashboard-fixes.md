# Feature: Ajustes UI Frontend POS (Nueva Venta Inline, Historial Completo) y Dashboard

## Metadata
- **Feature Name:** `frontend-pos-dashboard-fixes`
- **Topic Key Engram:** `odd/frontend-pos-dashboard-fixes/tasks`
- **Rama Git:** `feat/supabase-recovery-multilocal` *(sin commits por instrucción explícita del usuario para pruebas locales previas)*
- **Estrategia de Entrega:** `ask-on-risk`
- **Líneas estimadas:** ~140 (client TSX únicamente)
- **TDD Mode:** `off` (fuente: `client/package.json` sin runner de tests unitarios; verificación mediante `npm --prefix client run build`, `npx eslint` dirigido e inspección visual/funcional en `/browser`)
- **RDD Mode:** `off / sin commits` (el usuario solicitó explícitamente no realizar commits en esta ronda)

## Objective & Scope
1. Rediseñar el catálogo de productos en **Punto de Venta → Nueva Venta** (`client/src/pages/VentasPage.tsx`) de tarjetas grandes a filas **inline** compactas manteniendo los datos actuales (stock/agotado/servicio, `×N` en carrito, nombre, descripción/categoría, precio, botón `+`) y logrando que a primera vista se muestren **10 o más productos**.
2. Corregir el error visual al hacer zoom/scroll en **Dashboard → Productos Estancados** (`client/src/pages/Dashboard.tsx`) eliminando el `sticky` que provoca solapamiento/fuga de ítems y haciendo responsive el header y selector `"Sin movimiento hace:"`.
3. Eliminar el indicador **Ticket Promedio** del Dashboard (`Dashboard.tsx` tanto en "Resumen Mensual" como en las tarjetas de "Rendimiento Mensual por Tienda").
4. Corregir el desbordamiento del botón **Buscar** (y recorte de selectores de fecha) en **Punto de Venta → Historial Completo** (`client/src/pages/VentasPage.tsx`).

## Constraints
- **NO hacer commits de Git** en esta etapa (instrucción explícita del usuario para probar y validar primero).
- Mantener la lógica de negocio intacta (stock, carrito, pérdida bajo CPP, series, filtros de ventas).
- No tocar backend salvo que sea estrictamente necesario (el cálculo de `ticketPromedio` en `dashboard.service.ts` puede permanecer sin romperse o ignorarse en UI sin afectar contratos).

## Checklist de Tareas

- [x] **TASK-01** `[route: delegated]` — Dashboard (`client/src/pages/Dashboard.tsx`): quitar **Ticket Promedio** de "Resumen Mensual" (grilla de 4 KPIs `lg:grid-cols-4`) y de "Rendimiento Mensual por Tienda" (grilla equilibrada de 3 métricas), y corregir el error visual al hacer zoom/scroll en **Productos Estancados** (`overflow-hidden` en card, quitar `sticky top-0 z-10` del header para evitar solapamiento de ítems, hacer responsive/wrap la fila del selector `"Sin movimiento hace:"`; revisar también `Stock Crítico` para consistencia al hacer zoom).
  - *Acceptance:* Ticket Promedio ya no aparece en el Dashboard; Productos Estancados no superpone ítems ni rompe su cabecera/selector a `1024px`, `1280px` ni con zoom `125%–150%`.
  - *Checks:* `npm --prefix client run build` (exit 0), `npx eslint src/pages/Dashboard.tsx` (exit 0).
- [x] **TASK-02** `[route: delegated]` — Ventas POS (`client/src/pages/VentasPage.tsx`): rediseñar catálogo de **Nueva Venta** a filas **inline** compactas (`>= 10` productos visibles a primera vista conservando nombre, descripción/categoría, badge de stock/agotado/servicio, `×N`, precio y botón `+`) y corregir barra de filtros de **Historial Completo** para que el botón **Buscar** (y **Limpiar**) nunca sobresalgan del contenedor y los botones de fecha no corten su texto.
  - *Acceptance:* En Nueva Venta se visualizan >= 10 productos a primera vista con todos los datos; en Historial Completo ningún botón ni selector se sale de su card entre `375px` y `1600px`.
  - *Checks:* `npx tsc --noEmit` (exit 0), `npx eslint src/pages/VentasPage.tsx` (0 errores nuevos; 6 `no-explicit-any` preexistentes fuera de alcance).
- [x] **TASK-03** `[route: inline]` — Verificación integral (`tsc`/`vite build`, ESLint en archivos modificados y recorrido visual `/browser` verificando los 4 ajustes y conteo de filas visibles).
  - *Acceptance:* Build y lint en 0 errores nuevos; `/browser` confirma los 4 cambios en vivo sin errores de consola ni desbordes.
  - *Checks:* `npm --prefix client run build` (exit 0), `npx --prefix client eslint --config client/eslint.config.js client/src/pages/Dashboard.tsx client/src/pages/VentasPage.tsx` (0 errores en `Dashboard.tsx`; 0 nuevos en `VentasPage.tsx`, 6 preexistentes `no-explicit-any` en líneas 95, 96, 103, 117, 570, 585), `/browser` verificado (`12` productos visibles en `1280x800` y `11` en `1366x768`; `overflowPx = 0` en Historial Completo en `1440/1280/1024/768/640`; Productos Estancados sin solapamiento en `1280/1024/800`; Ticket Promedio ausente).

## Progress & Evidence
- Cambios aplicados sin commits en `client/src/pages/Dashboard.tsx` y `client/src/pages/VentasPage.tsx` para pruebas locales del usuario.
- Verificación final completada (3/3 tareas).
- **Actualización solicitada (Opción 1 en Productos Estancados):** En `client/src/pages/Dashboard.tsx` (líneas 707–747) se reemplazó `max-h-[400px]` fijo en desktop por un wrapper `flex-1 min-h-0 lg:relative lg:min-h-[360px]` con contenedor interno `max-h-[400px] lg:max-h-none lg:absolute lg:inset-0 overflow-y-auto` para que la lista y su barra de desplazamiento lleguen hasta el borde inferior de la tarjeta sin dejar espacio vacío ni empujar la altura del grid.
  - *Verificación post-cambio:* `npm --prefix client run build` (exit 0), `npx --prefix client eslint --config client/eslint.config.js client/src/pages/Dashboard.tsx` (exit 0), `/browser` (`1280x800`: `clientHeight = 756 px`, `bottomGap = 0.67 px`; `1366x768`: `clientHeight = 780 px`, `bottomGap = 0.67 px`, sin solapamientos).
- Próximo paso: pruebas manuales del usuario en `http://localhost:5173` y posterior `git commit` si aprueba los ajustes.
