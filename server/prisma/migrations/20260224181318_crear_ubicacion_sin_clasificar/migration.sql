-- Crear ubicación default "SIN CLASIFICAR" para productos sin ubicación específica
INSERT INTO "ubicaciones" (id, nombre, descripcion, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'SIN CLASIFICAR',
  'Ubicación predeterminada para productos que aún no han sido clasificados o ubicados en el sistema',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;