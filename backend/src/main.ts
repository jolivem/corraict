import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import express, { type NextFunction, type Request, type Response } from 'express';
import { AppModule } from './app.module';
import { loadEnv } from './config/env';

const STRIPE_WEBHOOK_PATH = '/v1/billing/webhook';

async function bootstrap() {
  const env = loadEnv();
  // Disable Nest's bundled body parser so we can give Stripe the raw Buffer
  // (required for signature verification) while still parsing JSON elsewhere.
  const app = await NestFactory.create(AppModule, { bufferLogs: false, bodyParser: false });
  app.enableShutdownHooks();

  app.use(STRIPE_WEBHOOK_PATH, express.raw({ type: '*/*', limit: '1mb' }));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === STRIPE_WEBHOOK_PATH) return next();
    return express.json({ limit: '1mb' })(req, res, next);
  });
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.setGlobalPrefix('v1', { exclude: ['health'] });
  app.enableCors({ origin: env.PUBLIC_WEB_URL, credentials: true });
  await app.listen(env.PORT, '0.0.0.0');
  console.log(`aicorrect backend listening on :${env.PORT} (${env.NODE_ENV})`);
}

bootstrap();
