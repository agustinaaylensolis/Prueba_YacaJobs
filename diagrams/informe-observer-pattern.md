# Informe: Patrón Observer — Implementación en YacaJobs

## Propósito en el sistema

Notificar automáticamente a los **trabajadores** cuando un **cliente** publica un nuevo trabajo relacionado con su oficio, sin acoplar la lógica de negocio (`crearPublicacion`) con los mecanismos de notificación (email, notificaciones internas).

---

## Componentes del patrón

### 1. `Subject` — Interfaz del Publicador (Sujeto abstracto)

**Archivo:** `backend/src/jobs/observers/subject.interface.ts`

```typescript
export interface Subject {
  attach(observer: Observer): void;
  detach(observer: Observer): void;
  notify(data: any): Promise<void> | void;
}
```

**Rol en el patrón:**
Define el **contrato** que cualquier publicador (sujeto concreto) debe cumplir. Establece tres operaciones:
- `attach(observer)` → permite que un observer se suscriba al publicador
- `detach(observer)` → permite que un observer se desuscriba
- `notify(data)` → notifica a todos los observers suscritos, enviándoles datos

**Principio SOLID:** *Dependency Inversion Principle* — los clientes (observers concretos) dependen de esta abstracción, no de implementaciones específicas.

---

### 2. `Observer` — Interfaz del Suscriptor (Observador abstracto)

**Archivo:** `backend/src/jobs/observers/observer.interface.ts`

```typescript
export interface Observer {
  update(subject: any, data: any): Promise<void> | void;
}
```

**Rol en el patrón:**
Define el **método de callback** que el publicador invocará en cada observer cuando ocurra un evento. El parámetro `subject` permite al observer saber **quién** disparó la notificación, y `data` contiene los datos del evento (en este caso, la publicación creada).

---

### 3. `JobPostingNotifier` — Publicador concreto (Sujeto concreto)

**Archivo:** `backend/src/jobs/observers/job-posting.notifier.ts`

```typescript
@Injectable()
export class JobPostingNotifier implements Subject {
  private observers: Observer[] = [];

  attach(observer: Observer): void {
    const isExist = this.observers.includes(observer);
    if (!isExist) {
      this.observers.push(observer);
    }
  }

  detach(observer: Observer): void {
    const observerIndex = this.observers.indexOf(observer);
    if (observerIndex !== -1) {
      this.observers.splice(observerIndex, 1);
    }
  }

  async notify(post: any): Promise<void> {
    for (const observer of this.observers) {
      observer.update(this, post)?.catch((err) => {
        console.error('[JobPostingNotifier] Error en observer:', err);
      });
    }
  }
}
```

**Rol en el patrón:**
- Es el **publicador concreto** que mantiene la lista de suscriptores (`observers`)
- Cuando se publica un nuevo trabajo, `JobsService.createPost()` invoca `notify(post)`
- Itera sobre todos los observers suscritos y llama a su método `update()`
- Utiliza `?.catch()` para manejar errores de forma **asíncrona y desacoplada** — si un observer falla, no bloquea al resto ni al hilo principal
- **Inyección de dependencias:** Decorado con `@Injectable()`, NestJS lo gestiona como singleton, compartiendo la misma instancia en toda la aplicación

**Flujo de invocación:**
```
JobsService.createPost(data)
  → guarda la publicación en Supabase
  → this.jobPostingNotifier.notify(publicacionCreada)
    → por cada observer en observers[]
      → observer.update(this, publicacionCreada)
```

---

### 4. `EmailNotificationObserver` — Suscriptor concreto #1 (Notificación por email)

**Archivo:** `backend/src/jobs/observers/email-notification.observer.ts`

```typescript
@Injectable()
export class EmailNotificationObserver implements Observer {
  constructor(
    @Inject(SupabaseService) private readonly supabaseService: SupabaseService,
    @Inject(JobPostingNotifier) private readonly notifier: JobPostingNotifier,
  ) {
    this.notifier.attach(this);  // ← Se suscribe automáticamente al crearse
  }

  async update(subject: any, post: any): Promise<void> {
    if (subject instanceof JobPostingNotifier) {
      // Busca trabajadores que tengan el oficio de la publicación
      const client = this.supabaseService.getClient();
      const { data: workers } = await client
        .from('oficio_del_trabajador')
        .select('id_trabajador')
        .eq('id_oficio', post.id_oficio);

      // Simula envío de email a cada trabajador
      for (const worker of workers) {
        console.log(`Enviando email al trabajador ${worker.id_trabajador}`);
      }
    }
  }
}
```

**Rol en el patrón:**
- Es un **observer concreto** que implementa `Observer.update()`
- **Auto-suscripción:** en el constructor se adjunta a `JobPostingNotifier.attach(this)`, eliminando la necesidad de configuración externa
- **Responsabilidad:** notificar vía **email** a los trabajadores interesados
- **Verificación del origen:** valida `subject instanceof JobPostingNotifier` para asegurarse de que la notificación viene del publicador correcto
- **Lógica de negocio:** consulta `oficio_del_trabajador` para encontrar trabajadores cuyo oficio coincida con `post.id_oficio`

---

### 5. `InAppNotificationObserver` — Suscriptor concreto #2 (Notificación interna)

**Archivo:** `backend/src/jobs/observers/in-app-notification.observer.ts`

```typescript
@Injectable()
export class InAppNotificationObserver implements Observer {
  constructor(
    @Inject(SupabaseService) private readonly supabaseService: SupabaseService,
    @Inject(JobPostingNotifier) private readonly notifier: JobPostingNotifier,
  ) {
    this.notifier.attach(this);  // ← Se suscribe automáticamente
  }

  async update(subject: any, post: any): Promise<void> {
    if (subject instanceof JobPostingNotifier) {
      // 1. Busca trabajadores con el oficio de la publicación
      const client = this.supabaseService.getClient();
      const { data: workers } = await client
        .from('oficio_del_trabajador')
        .select('id_trabajador')
        .eq('id_oficio', post.id_oficio);

      // 2. Crea una notificación en BD para cada trabajador
      const notificaciones = workers.map((worker) => ({
        id_usuario: worker.id_trabajador,
        tipo_usuario: 'WORKER',
        titulo: 'Nuevo trabajo en tu rubro',
        mensaje: 'Se ha publicado un nuevo trabajo relacionado con tu oficio.',
        id_publi: post.id_publi,
        leido: false,
      }));

      await client.from('notificaciones').insert(notificaciones);
    }
  }
}
```

**Rol en el patrón:**
- Es un **observer concreto** que implementa `Observer.update()`
- **Auto-suscripción:** también se adjunta automáticamente en el constructor
- **Responsabilidad:** crear notificaciones **dentro de la aplicación** (base de datos) para que los trabajadores las vean en el frontend al hacer clic en el ícono de campana (`NotificationBell.tsx`)
- **Persistencia:** inserta registros en la tabla `notificaciones` de Supabase, incluyendo:
  - `id_usuario` → el trabajador destinatario
  - `tipo_usuario` → 'WORKER'
  - `id_publi` → para navegar directamente a la publicación
  - `leido` → inicialmente `false`

---

## Diagrama de secuencia del patrón en acción

```
Cliente                   Publicacion            JobPostingNotifier           EmailObserver          InAppObserver
  │                            │                        │                         │                       │
  │──crearPublicacion()──▶    │                        │                         │                       │
  │                           │──guardar en BD──▶      │                         │                       │
  │                           │                        │                         │                       │
  │                           │──notify(post)─────────▶│                         │                       │
  │                           │                        │                         │                       │
  │                           │                        │──update(this, post)────▶│                       │
  │                           │                        │                         │──consulta oficio──▶   │
  │                           │                        │                         │──busca trabajadores▶  │
  │                           │                        │                         │──simula email ────▶  │
  │                           │                        │                         │                       │
  │                           │                        │──update(this, post)────▶│                       │
  │                           │                        │                         │──consulta oficio──▶   │
  │                           │                        │                         │──busca trabajadores▶  │
  │                           │                        │                         │──inserta notif────▶  │
```

---

## Conexión con las entidades de dominio

| Entidad de dominio | Relación con el Observer | Explicación |
|---|---|---|
| **`Publicacion`** | **Dispara** el patrón | Cuando un `Cliente` crea una `Publicacion`, el sistema invoca `JobPostingNotifier.notify(post)` |
| **`Oficio`** | **Filtra** los destinatarios | Los observers consultan `post.id_oficio` para saber qué rubro se publicó |
| **`Trabajador`** | **Destinatario** de la notificación | Los observers buscan trabajadores que posean ese `Oficio` vía la tabla `oficio_del_trabajador` |

---

## Beneficios de esta implementación

1. **Desacoplamiento total** — `JobsService` no sabe nada sobre emails ni notificaciones internas. Solo llama a `notify()` y los observers hacen el resto.

2. **Extensibilidad** — Para agregar un nuevo canal de notificación (ej: notificación push, SMS) solo hay que:
   - Crear una nueva clase que implemente `Observer`
   - Auto-adjuntarla en su constructor con `this.notifier.attach(this)`
   - Registrarla como provider en `JobsModule`
   - **Sin modificar** `JobPostingNotifier`, `JobsService` ni ninguna otra clase

3. **Tolerancia a fallos** — Cada observer se ejecuta con `?.catch()`, por lo que si falla el envío de emails, las notificaciones internas aún se crean correctamente.

4. **Principios SOLID**:
   - *Single Responsibility*: cada observer tiene UNA responsabilidad (email o notificación interna)
   - *Open/Closed*: el sistema está abierto a nuevos observers, cerrado a modificaciones
   - *Dependency Inversion*: todos dependen de interfaces (`Subject`, `Observer`), no de implementaciones concretas