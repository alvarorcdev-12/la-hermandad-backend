import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const port = configService.get<number>('port') ?? 3000;
  const apiPrefix = configService.get<string>('api.prefix') ?? 'api';

  app.setGlobalPrefix(apiPrefix);
  app.enableCors();

  await app.listen(port);
}
await bootstrap();
