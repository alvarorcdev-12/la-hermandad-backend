# Guía de la API

## Arquitectura y alcance

`AppModule` integra ConfigModule y seis módulos HTTP. Cada controlador delega en un servicio; Prisma accede a PostgreSQL mediante el adaptador `pg`. Los mappers preparan las respuestas públicas, aunque algunas escrituras devuelven registros Prisma directamente. JWT identifica al usuario y la estrategia carga su tienda y verifica que esté activo. El guard comprueba los roles indicados por `@Auth`.

Store, StoreSetting y Location se inicializan durante el registro. ProductImages existe en el modelo de datos. Estos recursos **no tienen controladores HTTP propios**. Payment y OrderItem se gestionan mediante OrdersModule. PrismaService, configuración, DTO de paginación y DBExceptionHelper son infraestructura interna; no tienen rutas públicas.

## Convenciones

- Prefijo predeterminado: `/api`; cuerpos JSON con `Content-Type: application/json`.
- `Authorization: Bearer <token>` en rutas protegidas; JWT válido por 24 horas. `check-status` emite uno nuevo.
- La tienda se obtiene del usuario autenticado, no de un parámetro `storeId` enviado por el cliente.
- La validación rechaza propiedades desconocidas. Las actualizaciones parciales conservan propiedades omitidas. Los validadores opcionales también pueden omitir la validación de `null`; una restricción de base de datos puede rechazarlo posteriormente.
- Identificadores de ruta: UUID. Fechas de salida: ISO 8601. Los importes de entrada son números; los Decimal de Prisma se serializan como cadenas, por ejemplo `"25.5"`.
- POST devuelve **201**, incluso login, cancelación y cierre. GET/PATCH/DELETE devuelven **200** con JSON; las eliminaciones no devuelven 204.
- Los errores incluyen `statusCode` y `message` (texto o arreglo de errores de validación); pueden incluir `error`. No se envuelven las respuestas exitosas en un campo `data`.

## Permisos

Todos = OWNER, MANAGER y CASHIER. Además del rol, el JWT debe corresponder a una cuenta activa.

| Recurso/acción                                 | Roles          |
| ---------------------------------------------- | -------------- |
| auth/login, auth/register                      | Público        |
| auth/check-status                              | Todos          |
| users/me, users/me/password                    | Todos          |
| users crear/listar/consultar/actualizar por id | OWNER, MANAGER |
| users/:id/status y eliminar usuario            | OWNER          |
| categories/products listar y consultar         | Todos          |
| categories/products crear y actualizar         | OWNER, MANAGER |
| categories/products eliminar                   | OWNER          |
| customers crear/listar/consultar/actualizar    | Todos          |
| customers eliminar                             | OWNER, MANAGER |
| Todas las operaciones de orders                | Todos          |

## Paginación y búsquedas

Los cinco listados devuelven `{ meta, results }`. `meta` contiene `totalItems`, `currentPage`, `pageSize`, `totalPages`, `hasNextPage` y `hasPreviousPage`.

`page=1`, `limit=10`, `sort=createdAt` y `direction=desc` son los valores predeterminados. Envía enteros positivos para página y límite; actualmente los DTO solo validan que sean positivos. `sort` se pasa a Prisma: debe ser un campo del modelo, no un alias calculado como `displayName` o `number`. No hay lista de campos permitidos en el servicio.

| Listado    | Búsqueda `q`                                            | Filtros adicionales                                           |
| ---------- | ------------------------------------------------------- | ------------------------------------------------------------- |
| categories | name                                                    | —                                                             |
| products   | title, sku                                              | status; category por nombre exacto, sin distinguir mayúsculas |
| customers  | firstName, lastName, phone, email                       | —                                                             |
| users      | firstName, lastName, email, phone                       | —                                                             |
| orders     | orderName y nombre/apellido/correo/teléfono del cliente | status; fechas aceptadas pero no aplicadas                    |

Las búsquedas de texto no distinguen mayúsculas. `orders/stats` sí aplica fechas; sin extremos utiliza el día actual del servidor. Normaliza los extremos al inicio y fin del día en su zona horaria. Si solo se envía un extremo, el otro permanece abierto.

## Flujo de venta

1. Registrar una tienda o iniciar sesión; autorizar con el JWT.
2. Crear categoría y productos. El stock disponible se controla cuando `trackInventory=true` (predeterminado en la base de datos).
3. Crear un cliente si se desea asociarlo a la venta.
4. Crear pedido con uno o más `{ productId, quantity }`. El servicio toma precios del catálogo, crea el pedido OPEN/PENDING y descuenta existencias controladas. El nombre usa prefijo, secuencia y sufijo de la tienda.
5. Agregar artículos mediante `POST /orders/:id/items`: cada ID agrega una línea de cantidad 1. Ajustar cantidades absolutas mediante `PATCH /orders/:id/items/:itemId`; cero oculta la línea en las respuestas. Reducir repone stock solamente con `restock=true`.
6. Registrar pagos mediante `POST /orders/:id/payment`. Devuelve Payment y recalcula estado financiero: parcial o pagado. Admite CASH, CARD, QR y BANK_TRANSFER. Un total pagado mayor o igual al importe de la orden produce PAID.
7. Cerrar con `POST /orders/:id/close`. Exige OPEN y estado financiero distinto de PENDING/PARTIALLY_PAID. Reabrir exige CLOSED y que no esté VOIDED.
8. Cancelar un pedido abierto establece CANCELLED/VOIDED, motivo y fecha. Repetir la cancelación devuelve el pedido sin reponer dos veces. No crea un reembolso.

Las estadísticas `orders`, `sales` e `items` excluyen cancelados; `cancelledOrders` los cuenta por separado. `sales` suma precios de pedidos, no cobros recibidos.

## Diferencias relevantes entre respuestas

- Auth devuelve `{ token, user }`; el perfil incluye `storeName`. Users devuelve StaffUser, sin storeName ni contraseña.
- Customers GET devuelve datos calculados (`displayName`, `amountSpent`, `numberOfOrders`, `canDelete`). POST/PATCH/DELETE devuelve CustomerRecord con `storeId` y `updatedAt`, sin esos agregados. `amountSpent` suma todos los pedidos del cliente, incluidos cancelados.
- Categories DELETE devuelve el registro con `storeId` y el nombre tal como está almacenado. Las otras respuestas pasan por el mapper, que capitaliza la primera letra.
- Order incluye el campo **`updateAt`**, sin la segunda `d`, y un cliente persistido o null. Los artículos con cantidad cero se omiten.
- El endpoint de pagos devuelve el pago creado; consulta de nuevo el pedido para obtener el estado financiero actualizado.

## Hallazgos del análisis del código

La implementación de Swagger no modifica estas reglas existentes:

| Hallazgo                        | Comportamiento actual / impacto                                                                                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fechas en listado de pedidos    | Se validan, pero el filtro está desactivado en OrdersService.findAll.                                                                                                             |
| `items` en PATCH de pedido      | El DTO lo acepta y valida; el servicio lo ignora. Usar endpoints de artículos.                                                                                                    |
| `password` en PATCH de usuario  | Aceptado, pero ignorado. Usar `users/me/password`.                                                                                                                                |
| `restock` en cancelación        | Ignorado: siempre repone artículos con inventario controlado.                                                                                                                     |
| Cambio de rol desde `users/me`  | UpdateUserDto acepta role y el servicio lo actualiza; cualquier usuario autenticado puede solicitar otro rol. Requiere una corrección de autorización aparte.                     |
| Referencias relacionadas        | Los recursos principales se filtran por tienda, pero no se valida de forma uniforme la pertenencia de categoryId/customerId antes de asociarlos.                                  |
| Cliente omitido al crear pedido | La consulta del cliente usa un id opcional; sin customerId puede seleccionar el primer cliente de la tienda para copiar email/phone, aunque el pedido quede sin cliente asociado. |
| Cantidades                      | DTO acepta números no enteros, aunque varias columnas Prisma son Int. Enviar enteros.                                                                                             |
| Pagos                           | Se permite superar el saldo; no existe endpoint de reembolso. Cambiar artículos recalcula totales, pero no recalcula el estado financiero.                                        |
| Errores Prisma                  | Algunos métodos no interceptan errores; un registro inexistente puede producir 500, especialmente pago o artículo inexistente. Usuarios.findOne usa 400 para usuario inexistente. |
| Iniciales del usuario           | El mapper puede fallar si no hay apellido y firstName tiene una sola palabra; los ejemplos de registro incluyen apellido.                                                         |

Estos hallazgos proceden de revisión estática de controladores, DTO, guards, servicios, mappers y esquema Prisma. Las pruebas de documentación verifican el contrato y HTTP con Prisma simulado; no certifican los flujos de negocio contra PostgreSQL.
