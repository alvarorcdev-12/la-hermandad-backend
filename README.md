# La Hermandad — Backend POS

API REST en NestJS 11, TypeScript y PostgreSQL con Prisma. Incluye autenticación JWT, personal, categorías, productos, clientes y pedidos con artículos, pagos y estadísticas.

## Preparación

```bash
pnpm install
cp .env.example .env
```

Configura `.env` con `APP_PORT` (3000), `API_PREFIX` (api), un `JWT_SECRET` privado y `DATABASE_URL`. Para el PostgreSQL del `docker-compose.yml`, el puerto del host es **5433**:

```dotenv
DATABASE_URL="postgresql://usuario:contraseña@localhost:5433/la_hermandad?schema=public"
```

Configura también `DATABASE_NAME`, `DATABASE_USER` y `DATABASE_PASSWORD` para Docker. Luego:

```bash
docker compose up -d
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm run start:dev
```

## Despliegue en Render

El build genera el cliente Prisma antes de compilar NestJS. `src/generated/prisma`
no se sube a Git; omitir la generación provoca errores como `Property 'customer'
does not exist on type 'PrismaService'`.

Para el servicio que ya existe, sube estos cambios y configura en Render:

| Ajuste | Valor |
| --- | --- |
| Runtime | Node |
| Build Command | `corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm run build` |
| Start Command | `pnpm run start:render` |
| Health Check Path | `/api/docs/openapi.json` |

Variables de entorno:

| Variable | Valor |
| --- | --- |
| `NODE_VERSION` | `24.18.0` |
| `NODE_ENV` | `production` |
| `API_PREFIX` | `api` |
| `DATABASE_URL` | URL PostgreSQL de producción; usa la Internal Database URL si la base está en Render y en la misma región |
| `JWT_SECRET` | Secreto aleatorio privado; conserva el existente si ya tienes usuarios con sesiones activas |

Puedes generar un secreto con `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`.
Render asigna `PORT` automáticamente; tiene prioridad sobre `APP_PORT`. El servidor
escucha en `0.0.0.0`. No subas `.env` ni uses `localhost` para la base de producción.

Para crear un servicio nuevo también puedes usar **New > Blueprint** con
[render.yaml](render.yaml): solicita `DATABASE_URL` y genera `JWT_SECRET`.
El Blueprint define solo el backend; debes proporcionar una base PostgreSQL.
Agregar el archivo no cambia automáticamente un servicio creado manualmente.

El arranque ejecuta `prisma migrate deploy` y solo inicia el servidor si las
migraciones terminan correctamente. Funciona sin un comando pre-deploy, incluso
en un servicio gratuito. Las dependencias de desarrollo se instalan explícitamente
porque contienen Prisma CLI y el compilador. No ejecutes `migrate dev` ni
`migrate reset` en producción. Si la base ya tiene tablas creadas sin historial de
Prisma, requiere un baseline antes de aplicar las migraciones existentes.

Tras guardar la configuración, ejecuta **Manual Deploy > Clear build cache & deploy**.
Comprueba `https://TU-SERVICIO.onrender.com/api/docs`. El health check verifica
que HTTP responde; no consulta la base de datos. Si cambias `API_PREFIX`, ajusta
también su ruta.

Referencias: [servicios web y puertos](https://render.com/docs/web-services),
[despliegues de Render](https://render.com/docs/deploys) y
[migraciones de producción](https://docs.prisma.io/docs/cli/migrate/deploy).

## Swagger y OpenAPI

Con la configuración predeterminada:

| Recurso      | Dirección                                   |
| ------------ | ------------------------------------------- |
| Swagger UI   | http://localhost:3000/api/docs              |
| OpenAPI JSON | http://localhost:3000/api/docs/openapi.json |
| OpenAPI YAML | http://localhost:3000/api/docs/openapi.yaml |

Las direcciones siguen `APP_PORT` y `API_PREFIX`. La documentación está disponible públicamente cuando se inicia el servidor.

1. Abre `auth` y ejecuta `POST /api/auth/register` para crear tienda y propietario, o `POST /api/auth/login` para acceder.
2. Copia `token` de la respuesta.
3. Pulsa **Authorize** y pega el token sin el prefijo `Bearer`.
4. Ejecuta las operaciones autorizadas para tu rol con **Try it out**. Las escrituras modifican la base de datos configurada.

Swagger documenta **38 operaciones**: cuerpos y ejemplos, campos obligatorios y opcionales, enumeraciones, filtros, UUID, respuestas, errores, JWT y roles. Los permisos también están disponibles como `x-roles` en OpenAPI.

```bash
# Compila y exporta docs/openapi.json sin conectarse a PostgreSQL
pnpm run docs:export

# Compila y verifica contratos y publicación HTTP de Swagger con Prisma simulado
pnpm run test:openapi

# Compilación de producción
pnpm run build
pnpm run start:prod
```

La exportación usa los controladores reales y sustituye Prisma; no consulta ni modifica datos. Después de modificar rutas o DTO, regenera el JSON y ejecuta las pruebas. Estas pruebas usan un puerto local efímero. El antiguo `test/app.e2e-spec.ts` contiene una prueba del starter para `/` que no corresponde a las rutas de este backend; `test:openapi` es una suite independiente.

## Módulos

| Módulo     | Operaciones | Responsabilidad                                            |
| ---------- | ----------: | ---------------------------------------------------------- |
| auth       |           3 | Registro, login y renovación de sesión                     |
| users      |           9 | Perfil, contraseña, personal y activación                  |
| categories |           5 | Crear, listar, consultar, actualizar y eliminar categorías |
| products   |           5 | Catálogo, precios, estado y existencias                    |
| customers  |           5 | Clientes y agregados de pedidos                            |
| orders     |          11 | Pedidos, estadísticas, artículos, estados y pagos          |

Consulta [la guía de la API](docs/API.md) para arquitectura, permisos, flujo de venta y particularidades del contrato. El contrato exportado está en [docs/openapi.json](docs/openapi.json).

## Mantenimiento

- `src/common/openapi/swagger.ts`: configuración de Swagger, etiquetas y URLs.
- `src/common/openapi/schemas.ts`: esquemas de las respuestas reales, incluidos Decimal y valores nulos.
- `src/common/openapi/api-endpoint.decorator.ts`: descripción, parámetros de ruta y respuestas comunes.
- `src/auth/decorators/auth.decorator.ts`: seguridad y roles publicados junto con los guards.
- Controladores y DTO: documentación de operaciones y entradas junto al código que las implementa.
- `test/openapi.test.mjs`: cobertura contra rutas reales, referencias, esquemas, permisos y publicación UI/JSON/YAML.

Se utiliza la integración oficial [OpenAPI de NestJS](https://docs.nestjs.com/openapi/introduction). La documentación describe el comportamiento implementado; las limitaciones detectadas se registran en la guía.
