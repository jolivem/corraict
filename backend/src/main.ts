import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadEnv } from './config/env';

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableShutdownHooks();
  await app.listen(env.PORT, '0.0.0.0');
  console.log(`aicorrect backend listening on :${env.PORT} (${env.NODE_ENV})`);
}

bootstrap();
