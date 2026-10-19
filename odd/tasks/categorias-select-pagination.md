# Feature: categorias-select-pagination

## Objective
Resolver la omisión de categorías en los selectores/comboboxes del frontend provocada por la paginación fija de 50 registros (`take: 50`) en el backend, permitiendo que todas las categorías activas (57+) se listen y seleccionen correctamente.

## Problem & Why
En producción existen 57 categorías activas (`deleted_at IS NULL`). `CategoriaService.listarTodas` aplicaba `take = 50` por defecto. En consecuencia, las últimas 7 categorías alfabéticamente (ej. `TECLADO USB`, `TECLADO INALAMBRICO`, `TINTA`, `SUPRESOR DE PICO`) eran omitidas de la respuesta `GET /api/categorias`. Al no aparecer en los selects, los usuarios intentaban crearlas de nuevo, pero el backend las rechazaba con error de clave duplicada (`@@unique([tipo, nombre])`), bloqueando la creación y selección.

## Scope & Constraints
- **In scope**:
  - Script/seed para replicar en local las 57 categorías del backup de producción.
  - Modificación de `server/src/services/categoria.service.ts` y `server/src/controllers/categoria.controller.ts` para soportar consultas completas para selects sin corte forzado a 50 y soportar `limit`/`take`.
  - Modificación de `client/src/services/categoria.service.ts` y `client/src/hooks/useCategorias.ts` para que los selects soliciten todas las categorías.
  - Verificación funcional integral.
- **Out of scope**:
  - Alterar el esquema de base de datos (`schema.prisma`) o constraints existentes.

## Checklist
- [x] **TASK-01**: Cargar las 57 categorías del backup en la base de datos local y comprobar la reproducción del fallo (RED: `GET /api/categorias` devuelve 50 de 57). (Route: direct inline)
- [ ] **TASK-02**: Actualizar `categoria.controller.ts` y `categoria.service.ts` para admitir `todas: true` / sin límite cuando `take` no está definido o es explícitamente ilimitado, y soportar `limit` como alias de `take`. (Route: direct inline)
- [ ] **TASK-03**: Actualizar `categoria.service.ts` y `useCategorias.ts` en el cliente para solicitar todas las categorías en selects/comboboxes. (Route: direct inline)
- [ ] **TASK-04**: Ejecutar verificación funcional: comprobar que la API devuelve las 57 categorías, que el combobox muestra `TECLADO USB`, `TINTA`, etc., y que el build compila sin errores. (Route: direct inline)

## Verification Evidence
- Task 1: Completado. Se sembraron las categorías del backup (`seed-production-categories.ts`). Se constató que `listarTodas` devuelve solo 50 de 57 categorías activas (`TECLADO USB: false`, `TINTA: false`, `SUPRESOR DE PICO: false`). Al intentar crear `TECLADO USB` arroja `Ya existe una categoría con ese nombre y tipo`.
- Task 2: Pendiente
- Task 3: Pendiente
- Task 4: Pendiente

## Next Step
Ejecutar TASK-02: actualizar `categoria.service.ts` y `categoria.controller.ts` para admitir listar todas las categorías sin paginación forzada.
