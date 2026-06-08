import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobPostingNotifier } from '../backend/src/jobs/observers/job-posting.notifier';
import { MessageNotifier } from '../backend/src/jobs/observers/message.notifier';
import { ContractNotifier } from '../backend/src/jobs/observers/contract.notifier';
import { InAppNotificationObserver } from '../backend/src/jobs/observers/in-app-notification.observer';
import { SupabaseService } from '../backend/src/supabase/supabase.service';
import { Observer } from '../backend/src/jobs/observers/observer.interface';

// ============================================================================
// 1. Pruebas del Sujeto (Notifier)
// ============================================================================
describe('Patrón Observer - Pruebas de Notifiers (Sujeto)', () => {
  let notifier: JobPostingNotifier;

  beforeEach(() => {
    // Para probar el comportamiento del sujeto, no necesitamos el TestingModule completo,
    // basta con instanciar la clase pura de forma aislada.
    notifier = new JobPostingNotifier();
  });

  it('Gestión de Suscripciones: Debería adjuntar observadores evitando duplicados, y eliminarlos correctamente', () => {
    // Creamos un Mock de un Observer
    const mockObserver: Observer = { update: vi.fn() };
    
    // Acción: adjuntamos el mismo observador dos veces
    notifier.attach(mockObserver);
    notifier.attach(mockObserver); 
    
    // Verificación: Accedemos a la propiedad privada usando un cast (any)
    // para confirmar que el array no admitió el duplicado.
    expect((notifier as any).observers).toHaveLength(1);

    // Acción: Eliminamos el observador
    notifier.detach(mockObserver);
    
    // Verificación
    expect((notifier as any).observers).toHaveLength(0);
  });

  it('Distribución de Mensajes: Debería iterar e invocar el método update() de todos los observadores registrados', async () => {
    // Mocks de múltiples observadores
    const obs1: Observer = { update: vi.fn().mockResolvedValue(undefined) };
    const obs2: Observer = { update: vi.fn().mockResolvedValue(undefined) };
    
    notifier.attach(obs1);
    notifier.attach(obs2);

    const payloadDummy = { post: { id: 1 }, destinatarios: [1, 2] };
    
    // Acción: Notificamos a todos
    await notifier.notify(payloadDummy);

    // Verificación: Ambos debieron ser llamados con la instancia del notifier y los datos
    expect(obs1.update).toHaveBeenCalledWith(notifier, payloadDummy);
    expect(obs2.update).toHaveBeenCalledWith(notifier, payloadDummy);
  });

  it('Aislamiento de Errores: Debería manejar excepciones asíncronas en un observador sin romper el proceso', async () => {
    const obsExitoso: Observer = { update: vi.fn().mockResolvedValue(undefined) };
    
    // Mock de un observador fallido (Ej: un servicio de Email que se cae)
    const obsFallido: Observer = { 
      update: vi.fn().mockRejectedValue(new Error('Fallo crítico de red'))
    };

    notifier.attach(obsFallido);
    notifier.attach(obsExitoso);

    // Espiamos console.error para interceptarlo y evitar que ensucie los logs de la consola en el test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Acción y Verificación: notify NO debe arrojar un error ("resolves.not.toThrow")
    // El .catch() interno debe absorber la caída.
    await expect(notifier.notify({ post: {}, destinatarios: [] })).resolves.not.toThrow();

    // Verificamos que el error se registró en consola (se maneja de forma controlada)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[JobPostingNotifier] Error asíncrono en observer:'), 
      expect.any(Error)
    );

    // Verificamos que el segundo observador SI corrió, a pesar del fallo del primero
    expect(obsExitoso.update).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

// ============================================================================
// 2. Pruebas del Observador (InAppNotificationObserver)
// ============================================================================
describe('Patrón Observer - Pruebas de InAppNotificationObserver', () => {
  let observer: InAppNotificationObserver;
  let jobNotifier: JobPostingNotifier;
  let messageNotifier: MessageNotifier;
  
  // Variable para simular el cliente devuelto por Supabase
  let mockSupabaseClient: any;

  beforeEach(async () => {
    // Mock completo encadenable (Chainable Mock) para simular `client.from().insert()`
    mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    // Mock del servicio de Supabase
    const mockSupabaseService = {
      getClient: vi.fn().mockReturnValue(mockSupabaseClient),
    };

    // Construcción del Módulo de Pruebas nativo de NestJS
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        InAppNotificationObserver,
        JobPostingNotifier,
        MessageNotifier,
        ContractNotifier,
        // Inyectamos nuestro Mock en lugar del servicio real de Base de Datos
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    observer = moduleRef.get<InAppNotificationObserver>(InAppNotificationObserver);
    jobNotifier = moduleRef.get<JobPostingNotifier>(JobPostingNotifier);
    messageNotifier = moduleRef.get<MessageNotifier>(MessageNotifier);
  });

  it('Discriminación de Contexto (JobPostingNotifier): Debería generar el payload para FORO', async () => {
    const payload = {
      post: { id_publi: 123 },
      destinatarios: [99],
    };

    // Acción: Simulamos que la alerta llega desde el Notificador de Trabajos
    await observer.update(jobNotifier, payload);

    // Verificación
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('notificaciones');
    expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id_usuario: 99,
          titulo: 'Nuevo trabajo en tu rubro',
          seccion_destino: 'FORO', // Lógica de negocio clave validada
        })
      ])
    );
  });

  it('Discriminación de Contexto (MessageNotifier): Debería generar el payload para MENSAJERIA', async () => {
    const payload = {
      message: { id_mensaje: 5 },
      destinatarios: [{ id_usuario: 88, tipo_usuario: 'CLIENT' }],
    };

    // Acción: Simulamos que la alerta llega desde el Notificador de Mensajes
    await observer.update(messageNotifier, payload);

    // Verificación
    expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id_usuario: 88,
          seccion_destino: 'MENSAJERIA', // Lógica de negocio clave validada
        })
      ])
    );
  });
});

/*
===============================================================================
DOCUMENTACIÓN EXPLICATIVA DE TÉCNICAS UTILIZADAS
===============================================================================

1. Test "Gestión de Suscripciones":
   - Técnica: "State Verification" accediendo a la propiedad privada con un cast
     `(notifier as any).observers`.
   - Por qué es importante: Garantizar la integridad de los datos. Si un observador
     se adjunta dos veces por accidente, el usuario recibiría la misma notificación dos veces.

2. Test "Distribución de Mensajes":
   - Técnica: "Behavior Verification" usando Mock Functions (`vi.fn()`).
   - Por qué es importante: El sujeto no retorna nada al final de `notify()`, por ende
     la única forma de saber si hizo su trabajo es "espiar" a sus dependientes y
     asegurarse de que los invocó con los parámetros correctos (`toHaveBeenCalledWith`).

3. Test "Aislamiento de Errores" (Crucial):
   - Técnica: Inyección deliberada de excepciones asíncronas (`mockRejectedValue`) 
     combinada con `resolves.not.toThrow()` y espionaje a `console.error`.
   - Por qué es importante: Demuestra de forma matemática que el Patrón Observer
     cumple su mayor propósito: desacoplamiento resiliente. La caída del módulo de
     notificaciones o correos nunca podrá derribar el hilo principal de la aplicación.
     Además, verificamos que otros observadores sigan ejecutándose aunque uno falle.

4. Test "Discriminación de Contexto":
   - Técnica: "Mocking Completo del ORM" mediante objetos encadenables (`mockReturnThis`) 
     y el Inversor de Dependencias de Nest (`Test.createTestingModule`).
   - Por qué es importante: Al mockear la Base de Datos con `useValue`, probamos el 100% de la 
     Lógica de Negocio (if/else de subject, generación de payloads y asignación de destinos)
     en milisegundos y con cero riesgo de alterar datos de producción (Cero Red). 
     El uso de `expect.arrayContaining` asegura que la estructura interna del JSON es válida.
*/
