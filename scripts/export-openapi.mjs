import { mkdir, writeFile } from 'node:fs/promises';
import { createDocumentationApp } from './openapi-app.mjs';
import { createOpenApiDocument } from '../dist/src/common/openapi/swagger.js';
const app = await createDocumentationApp(process.env.API_PREFIX || 'api');
try {
  await mkdir('docs', { recursive: true });
  await writeFile(
    'docs/openapi.json',
    JSON.stringify(createOpenApiDocument(app), null, 2) + '\n',
  );
  console.log(
    'OpenAPI exportado a docs/openapi.json (sin conexión a la base de datos).',
  );
} finally {
  await app.close();
}
