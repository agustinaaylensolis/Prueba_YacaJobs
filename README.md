# Informe de Desarrollo YacaJobs - MVP Fase 1 🐊

¡Hola! Como Arquitecto de Software, he desarrollado la base sólida para **YacaJobs**, enfocándome en la seguridad, validación de datos y una experiencia de usuario (UX) de alta calidad siguiendo la estética **Soft UI Minimalista**.

## 1. Stack Tecnológico Implementado
- **Frontend**: React + TypeScript + Vite + Tailwind CSS.
  - Diseño basado en bordes muy redondeados (`rounded-[2rem]`), sombras suaves y paleta de verdes corporativa.
  - Animaciones fluidas con `motion`.
- **Backend (Base)**: Arquitectura limpia en NestJS (código proporcionado en `/backend`).
  - Validaciones estrictas con `class-validator` para edad ≥ 18 años y obligatoriedad de archivos.
- **Base de Datos**: PostgreSQL compatible con Supabase (script SQL en `/supabase_setup.sql`).

## 2. Estructura del Proyecto
```text
/
├── supabase_setup.sql      # Script SQL para crear todas las tablas en Supabase
├── backend/                # Código base NestJS
│   ├── prisma/
│   │   └── schema.prisma   # Esquema 3FN para DB
│   └── src/
│       └── auth/
│           ├── dto/        # Objetos de Transferencia con validaciones
│           └── auth.controller.ts # Lógica de registro diferenciado
├── src/                    # Código Frontend React
│   ├── App.tsx             # Aplicación principal (Landing + Dashboards)
│   ├── constants.ts        # Paleta de colores y activos
│   ├── index.css           # Estilos globales Soft UI
│   └── types.ts            # Tipados compartidos
└── metadata.json           # Configuración del proyecto
```

## 3. Lógica de Negocio y Validaciones (Crítico)
- **Registro de Cliente**: Obligatorio DNI (Frente/Dorso) y Edad > 18.
- **Registro de Trabajador**:
  - **Filtro de Seguridad**: No se permite registro sin: DNI (F/D), Certificado de Buena Conducta y Selección de al menos un oficio.
  - **Validación Backend**: Los DTOs en NestJS rechazan el registro si falta alguna URL de archivo obligatoria.
- **Dashboards**:
  - **Cliente**: Búsqueda por oficio y vista de foro para publicar problemas.
  - **Trabajador**: Perfil con Scoring (estrellas) y visualización de ofertas sugeridas según su oficio.

## 4. Guía de Configuración para Supabase
Para poner en marcha la base de datos y almacenamiento:

### A. Base de Datos (SQL Editor)
1. Ve a tu proyecto en **Supabase**.
2. Abre el **SQL Editor**.
3. Copia y pega el contenido de `supabase_setup.sql`.
4. Ejecuta el script. Esto creará el esquema 3FN y los oficios iniciales.

### B. Storage (Cubetas de Archivos)
1. Ve a **Storage** en Supabase.
2. Crea una cubeta llamada `dni-archivos` (para clientes y trabajadores) y otra llamada `certificados` (para trabajadores).
3. Asegúrate de configurar las **Policies** para que los usuarios puedan subir sus propios archivos (Authenticated users can upload).

### C. Variables de Entorno (.env)
Configura las siguientes variables en tu backend y frontend:

**Backend (.env)**
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"
SUPABASE_URL="https://[PROJECT-ID].supabase.co"
SUPABASE_KEY="[TU-SERVICE-ROLE-KEY]"
```

**Frontend (.env)**
```env
VITE_SUPABASE_URL="https://[PROJECT-ID].supabase.co"
VITE_SUPABASE_ANON_KEY="[TU-ANON-KEY]"
```

## 5. Próximos Pasos (Fase 2)
- Implementar el envío de correos de confirmación.
- Integrar la API de Notificaciones en tiempo real para la mensajería.
- Realizar el despliegue automático conectando el repositorio de GitHub con **Vercel**.

---
*Este proyecto fue generado como parte de la entrega de Ingeniería de Software 2 (2026).*
