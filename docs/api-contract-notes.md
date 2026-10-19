# Particularidades del contrato actual

Esta implementación incorpora documentación sin cambiar servicios, validadores,
rutas, permisos ni mappers. Los siguientes comportamientos se encontraron al
revisar el código y deben tenerse en cuenta al consumir la API:

- **Perfil propio:** en `src/users/users.controller.ts`, `GET /users/:id` y
  `PATCH /users/:id` se registran antes de `/users/me`. Las pruebas HTTP confirman
  que OWNER recibe 400 por UUID inválido al consultar o actualizar `/users/me`.
  GET exige los roles de la ruta dinámica (OWNER/MANAGER) y PATCH exige OWNER;
  los demás roles reciben 403. Se documenta el método declarado y su respuesta
  prevista, pero la descripción advierte que no es alcanzable actualmente.
- **Seed público:** `GET /seed` no tiene guard ni restricción por entorno.
  `SeedService` intenta borrar todas las tiendas antes de insertar ejemplos.
  Las relaciones restrictivas pueden impedirlo cuando existen pedidos.
  Deshabilitar Swagger en producción no protege este endpoint.
- **Pedidos:** `POST /orders/:id/open` nunca tiene éxito (400 si existe, 404 si no).
  `GET /orders` valida `startDate` y `endDate`, pero no los usa; estadísticas sí
  aplica fechas. Cancelar siempre repone inventario controlado aunque se envíe
  `restock=false`. `PATCH /orders/:id` acepta `items` pero lo ignora. Los pagos no
  tienen deduplicación durable por clave de solicitud.
- **Usuarios:** actualizar personal acepta `password` y `posPin` pero no los
  guarda; actualizar perfil tampoco usa `role`. Generar un PIN no lo reserva.
  Crear personal sin `email` puede hacer una búsqueda sin filtro de correo;
  el servicio distingue `null` de `undefined` en ese caso. Login por contraseña
  y cambio de contraseña pueden fallar con 500 si la cuenta no tiene contraseña.
  No se documenta una protección del último propietario porque no existe.
- **Respuestas:** actualizar/eliminar clientes y eliminar categorías devuelve
  campos persistidos, distintos del mapper usado al consultar. El cliente dentro
  de un pedido incluye `storeId` y `updatedAt`. El pedido conserva la clave
  `updateAt` y convierte su número comercial BigInt a number; esto no garantiza
  precisión fuera del rango seguro de JavaScript. El correo del mapper User
  puede ser null aunque su tipo original lo declare string.
- **Validación:** varios mensajes predeterminados de class-validator y Passport
  siguen en inglés. La documentación está en español sin alterar esos mensajes.
  Paginación exige números positivos, pero no enteros ni límite máximo; `sort`
  no tiene una lista de campos permitidos. Algunos valores admitidos por DTO
  pueden fallar posteriormente en Prisma. Las anotaciones de actualización
  añaden solo metadatos; mantienen `PartialType` de `@nestjs/mapped-types` y la
  validación especial de `discountAmount`, que no permite null.
- **Referencias y errores:** crear/actualizar productos no verifica que la
  categoría pertenezca a la misma tienda. `DBExceptionHelper` tiene registros de
  errores crudos y algunas respuestas con códigos internos; no hay filtro global
  que los normalice. La documentación no introduce cambios en ese manejo.
- **Configuración POS:** README y `.env.example` existentes indican base64 para
  las claves, mientras `PosPinService` exige claves hexadecimales de 64 caracteres.
  No se han modificado las claves ni la configuración de cifrado.

La prueba e2e heredada `test/app.e2e-spec.ts` espera `GET /` con `Hello World!`,
pero no existe ese endpoint. Además, la configuración Vitest heredada no emite
los metadatos de decoradores de TypeScript. La suite específica de OpenAPI usa
la compilación real de Nest para verificar la documentación sin sustituir ni
migrar las suites existentes.

## Validación de esta entrega

- `pnpm run test:openapi`: 10 pruebas aprobadas.
- `pnpm run build` y `pnpm exec tsc --noEmit -p tsconfig.build.json`: aprobados.
- `pnpm run lint`: sin errores; cuatro advertencias en archivos preexistentes.
- `pnpm run test`: 137 pruebas aprobadas y dos fallidas, reproducidas también en
  una copia del commit original: `auth-pin.spec.ts` espera un include de tienda
  que el login no realiza y `users.service.spec.ts` espera omitir la búsqueda
  cuando email es undefined.
- `pnpm exec tsc --noEmit` sobre todo el repositorio falla por `dotenv/config`
  en `prisma7.config.ts`; el mismo error se reproduce en el commit original.
- No se ejecutó la suite e2e heredada ni se hicieron pruebas contra PostgreSQL.
  Las pruebas HTTP de OpenAPI usan los guards reales y Prisma simulado.
