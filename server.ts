import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './backend/src/app.module';
import { ValidationPipe } from '@nestjs/common';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedApp: any;

async function bootstrap() {
  if (cachedApp) return cachedApp;

  try {
    console.log('--- STARTING BOOTSTRAP ---');
    const app = await NestFactory.create(AppModule);
    
    // 1. NEST CONFIG FIRST
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    // 2. MIDDLEWARE via app.use (standard Nest way)
    app.use((req: any, res: any, next: any) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[REQ] ${req.method} ${req.url} -> ${res.statusCode} (${duration}ms)`);
      });
      next();
    });

    const expressApp = app.getHttpAdapter().getInstance();
    
    // Global JSON header force - Only for API
    app.use('/api', (req: any, res: any, next: any) => {
      res.setHeader('Content-Type', 'application/json');
      next();
    });

    const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
    const PORT = process.env.PORT || 3000;

    if (isProduction && !process.env.VERCEL) {
      const distPath = path.join(process.cwd(), 'dist');
      expressApp.use(express.static(distPath));
      // SPA Fallback for production (Only for standalone servers)
      expressApp.get('*', (req: any, res: any, next: any) => {
        if (req.url.startsWith('/api')) return next();
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    if (!process.env.VERCEL) {
      console.log('Starting to listen...');
      await app.listen(PORT, '0.0.0.0');
      console.log(`${isProduction ? 'PRODUCTION' : 'BACKEND'} READY: http://0.0.0.0:${PORT}`);
    } else {
      await app.init();
    }

    cachedApp = expressApp;
    return expressApp;
  } catch (error) {
    console.error('FATAL BOOTSTRAP ERROR:', error);
    if (!process.env.VERCEL) process.exit(1);
    throw error;
  }
}

// Support for local/standalone execution
if (!process.env.VERCEL) {
  bootstrap();
}

// Export for Vercel
export default async (req: any, res: any) => {
  const app = await bootstrap();
  return app(req, res);
};
