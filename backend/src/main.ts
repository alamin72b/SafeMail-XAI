import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? (process.env.EXTENSION_ORIGIN ??
          'chrome-extension://<your-extension-id>')
        : true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: true, // reject payloads with extra fields
      transform: true, // auto-transform to DTO class instances
    }),
  );

  const port = Number(process.env.PORT ?? 4000);

  try {
    await app.listen(port, '0.0.0.0');
    logger.log(`🚀 Inference API listening on http://0.0.0.0:${port}/api/v1`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to bind to port ${port}: ${message}`);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
