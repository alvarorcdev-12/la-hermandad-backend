<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# La Hermandad — Backend

Necesitas Node.js 24, pnpm y Docker con Docker Compose.

## Levantar en desarrollo

1. Clonar el proyecto y entrar en la carpeta:

   ```bash
   git clone git@github.com:alvarorcdev-12/la-hermandad-backend.git
   cd la-hermandad-backend
   ```

2. Instalar las dependencias:

   ```bash
   pnpm install --frozen-lockfile
   ```

3. Copiar `.env.example` y renombrar la copia a `.env`:

   ```bash
   cp .env.example .env
   ```

4. Cambiar las variables de entorno en `.env`:

   - Configura `DATABASE_NAME`, `DATABASE_USER` y `DATABASE_PASSWORD`, y coloca los mismos datos en `DATABASE_URL` (puerto `5432`).
   - Completa `JWT_SECRET`, `POS_PIN_ENCRYPTION_KEY` y `POS_PIN_LOOKUP_KEY`. Ejecuta este comando tres veces y usa un valor distinto para cada variable:

     ```bash
     node -e 'console.log(require("node:crypto").randomBytes(32).toString("base64"))'
     ```

   Conserva estas claves entre reinicios. Puedes dejar las demás variables con los valores de la plantilla.

5. Levantar la base de datos:

   ```bash
   docker compose up -d la-hermandad-db
   ```

6. Aplicar las migraciones y generar el cliente Prisma cuando PostgreSQL esté listo:

   ```bash
   pnpm exec prisma migrate deploy --config prisma7.config.ts
   pnpm exec prisma generate --config prisma7.config.ts
   ```

7. Iniciar el backend en desarrollo:

   ```bash
   pnpm run start:dev
   ```

   La API estará disponible en `http://localhost:3000/api`.

8. Ejecutar el seed desde otra terminal, con el backend encendido:

   **Solo para desarrollo: elimina los datos existentes de las tiendas y carga datos de ejemplo.**

   ```bash
   curl --fail-with-body http://localhost:3000/api/seed
   ```

   Al finalizar devuelve `{"ok":true,"message":"SEED EXECUTED"}`. No necesitas ejecutarlo en cada arranque.

9. Iniciar sesión con el usuario de prueba:

   - Correo: `alvaro@google.com`
   - Contraseña: `123456`
   - Rol: `OWNER`

   ```bash
   curl --fail-with-body -X POST http://localhost:3000/api/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"email":"alvaro@google.com","password":"123456"}'
   ```
