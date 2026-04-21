# YacaJobs - Plataforma de Oficios 

¡Bienvenido a **YacaJobs!** Una plataforma full-stack moderna diseñada para conectar clientes con profesionales de oficios (plomeros, electricistas, carpinteros) bajo una estética **Soft UI** y una arquitectura robusta.

## Arquitectura del Proyecto
Este proyecto utiliza una **Arquitectura Híbrida Unificada**:
- **Core Orquestador (`server.ts`)**: Un único punto de entrada basado en Express que integra el backend de NestJS y el frontend de Vite.
- **Backend (NestJS)**: Lógica modular en `/backend`. Maneja la API, validaciones estrictas de DTOs y la comunicación segura con Supabase.
- **Frontend (React + Vite)**: Una Single Page Application (SPA) reactiva alojada en `/src`, estilizada con **Tailwind CSS v4** y animada con `motion`.
- **Despliegue Serverless**: Totalmente optimizado para **Vercel** mediante funciones de Node.js y reescritura de rutas.

## Stack Tecnológico
- **Frontend**: React 19, TypeScript, Tailwind CSS (Soft UI Design), Lucide React (Iconografía).
- **Backend**: NestJS 11, Express, Class-Validator (Validación de datos).
- **Base de Datos**: PostgreSQL (vía Supabase).
- **Autenticación**: JWT/Bcrypt (vía lógica personalizada en NestJS + Supabase).
- **Despliegue**: Vercel (Configurado en `vercel.json`).

## Estructura 
```text
├── server.ts               # Orquestador Full-Stack y Entry point para Vercel
├── vercel.json             # Configuración de despliegue y rewrites
├── package.json            # Gestión de dependencias unificada
├── supabase_setup.sql      # Script SQL para inicializar la base de datos
├── backend/                # Lógica del Servidor (NestJS)
│   └── src/
│       ├── auth/           # Registro (Cliente/Trabajador) y Login
│       ├── jobs/           # Foro de trabajos y Postulaciones
│       └── supabase/       # Cliente de base de datos global
└── src/                    # Lógica del Cliente (React)
    ├── App.tsx             # Vistas de Dashboards y Landing
    ├── index.css           # Sistema de diseño Soft UI
    ├── types.ts            # Tipados compartidos
    └── lib/                # Configuración de Supabase Client
```

## Características Implementadas
- **Sistema de Registro Diferenciado**:
  - **Clientes**: Validación de edad (18+), DNI y perfil básico.
  - **Trabajadores**: Validación estricta de Foto de DNI, Certificado de Buena Conducta y selección de oficios.
- **Dashboard del Cliente**:
  - Búsqueda de trabajadores por oficio.
  - Publicación de trabajos en el **Foro de Pedidos** con niveles de urgencia.
  - Visualización y gestión de presupuestos recibidos.
- **Dashboard del Trabajador**:
  - Foro de trabajos disponibles en tiempo real.
  - Sistema de envío de presupuestos (Monto + Descripción).
  - Perfil profesional con scoring y reputación.

## Configuración y Despliegue

### 1. Preparar la Base de Datos
Copia el contenido de `supabase_setup.sql` y ejecútalo en el **SQL Editor** de tu proyecto en Supabase para crear las tablas y los oficios iniciales.

### 2. Variables de Envío
Crea un archivo `.env` (o configura los secrets en AI Studio/Vercel):
```env
# Supabase URL
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_URL=https://tu-proyecto.supabase.co

# Supabase Key
VITE_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_KEY=tu-service-role-key # Solo para el backend
```

### 3. Ejecución Local
```bash
npm install
npm run dev
```
El servidor correrá en `http://localhost:3000`, sirviendo tanto la API como el frontend con HMR.
### 4 . Ejecución Web
https://prueba-yaca-jobs-theta.vercel.app/

---
*Desarrollado para el Proyecto de Ingeniería de Software (2026).*
