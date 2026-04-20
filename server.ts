import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './backend/src/app.module.js';
import { ValidationPipe } from '@nestjs/common';
import express from 'express';
import { createServer as createViteServer } from 'vite';
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

    const isVercel = !!process.env.VERCEL || !!process.env.AWS_REGION;
    const isProduction = process.env.NODE_ENV === 'production' || isVercel;
    const PORT = process.env.PORT || 3000;

    if (isProduction) {
      if (!isVercel) {
        const distPath = path.join(process.cwd(), 'dist');
        expressApp.use(express.static(distPath));
        // SPA Fallback for production (Only for standalone servers)
        expressApp.get('*', (req: any, res: any, next: any) => {
          if (req.url.startsWith('/api')) return next();
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }
    } else {
      // Vite middleware for development
      console.log('--- ENABLING VITE MIDDLEWARE ---');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      expressApp.use(vite.middlewares);
    }

    if (!isVercel) {
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
    if (!(!!process.env.VERCEL || !!process.env.AWS_REGION)) process.exit(1);
    throw error;
  }
}

// Support for local/standalone execution
if (!(!!process.env.VERCEL || !!process.env.AWS_REGION)) {
  bootstrap().catch(err => {
    console.error('Failed to start standalone server:', err);
  });
}

// Export for Vercel / Serverless
export const handler = async (req: any, res: any) => {
  const app = await bootstrap();
  return app(req, res);
};

export default handler;
