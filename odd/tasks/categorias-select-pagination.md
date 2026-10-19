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
- [x] **TASK-02**: Actualizar `categoria.controller.ts` y `categoria.service.ts` para admitir `todas: true` / sin límite cuando `take` no está definido o es explícitamente ilimitado, y soportar `limit` como alias de `take`. (Route: direct inline)
- [x] **TASK-03**: Actualizar `categoria.service.ts` y `useCategorias.ts` en el cliente para solicitar todas las categorías en selects/comboboxes. (Route: direct inline)
- [x] **TASK-04**: Ejecutar verificación funcional: comprobar que la API devuelve las 57 categorías, que el combobox muestra `TECLADO USB`, `TINTA`, etc., y que el build compila sin errores. (Route: direct inline)

## Verification Evidence
- Task 1: Completado. Se sembraron las categorías del backup (`seed-production-categories.ts`). Se constató que `listarTodas` devuelve solo 50 de 57 categorías activas (`TECLADO USB: false`, `TINTA: false`, `SUPRESOR DE PICO: false`). Al intentar crear `TECLADO USB` arroja `Ya existe una categoría con ese nombre y tipo`.
- Task 2: Completado. Se modificaron `categoria.service.ts` y `categoria.controller.ts` para no limitar cuando no se envían parámetros de paginación o cuando se envía `todas: true`. Probado con `ts-node`: la llamada sin paginación devuelve las 57 categorías activas incluyendo `TECLADO USB`, `TECLADO INALAMBRICO`, `TINTA`, `SUPRESOR DE PICO`. Cuando se envía `take: 25`, pagina 25 de 57 normalmente. Build exitoso.
- Task 3: Completado. Se actualizaron `GetAllCategoriasParams` en `client/src/services/categoria.service.ts` y `UseCategoriasParams` en `client/src/hooks/useCategorias.ts` para soportar `todas` y `limit`. Build de cliente (`tsc -b && vite build`) completado con éxito sin errores de tipos.
- Task 4: Completado. Se ejecutó script de verificación integral que comprobó:
  1. `listarTodas({})` devuelve las 57 categorías activas.
  2. `listarTodas({ tipo: 'PRODUCTO' })` devuelve las 42 categorías de producto activas incluyendo `TECLADO USB`, `TECLADO INALAMBRICO`, `TINTA`, `SUPRESOR DE PICO`.
  3. `listarTodas({ tipo: 'SERVICIO' })` devuelve las 15 categorías de servicio activas incluyendo `TRASLADO INFORMACIÓN`.
  4. `listarTodas({ skip: 0, take: 25 })` pagina correctamente a 25 ítems y conserva total 57.
  5. Ambos proyectos (`server` y `client`) compilan limpiamente en sus builds de producción.

## Next Step
Reportar al usuario el resultado de las pruebas y la solución verificada.
