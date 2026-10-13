import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1); // correct client IP behind a load balancer; configure for your infra
  app.enableShutdownHooks(); // flushes the audit queue on SIGTERM
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
