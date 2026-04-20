import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './backend/src/app.module';
import { ValidationPipe } from '@nestjs/common';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
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

    const isProduction = process.env.NODE_ENV === 'production';
    const PORT = isProduction ? 3000 : 3001;

    if (isProduction) {
      const distPath = path.join(process.cwd(), 'dist');
      expressApp.use(express.static(distPath));
      // SPA Fallback for production
      expressApp.get('*', (req: any, res: any, next: any) => {
        if (req.url.startsWith('/api')) return next();
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    console.log('Starting to listen...');
    await app.listen(PORT, '0.0.0.0');
    console.log(`${isProduction ? 'PRODUCTION' : 'BACKEND'} READY: http://0.0.0.0:${PORT}`);
  } catch (error) {
    console.error('FATAL BOOTSTRAP ERROR:', error);
    process.exit(1);
  }
}

bootstrap();
