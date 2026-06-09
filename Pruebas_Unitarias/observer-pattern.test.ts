import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobPostingNotifier } from '../backend/src/jobs/observers/job-posting.notifier';
import { MessageNotifier } from '../backend/src/jobs/observers/message.notifier';
import { ContractNotifier } from '../backend/src/jobs/observers/contract.notifier';
import { InAppNotificationObserver } from '../backend/src/jobs/observers/in-app-notification.observer';
import { SupabaseService } from '../backend/src/supabase/supabase.service';
import { Observer } from '../backend/src/jobs/observers/observer.interface';


//Pruebas del Sujeto (Notifier)
describe('Patrón Observer - Pruebas de Notifiers (Sujeto)', () => {
  let notifier: JobPostingNotifier;

  beforeEach(() => {
    // Para probar el comportamiento del sujeto, no necesitamos el TestingModule completo solo instanciar la clase pura de forma aislada.
    notifier = new JobPostingNotifier();
  });

  it('Gestión de Suscripciones: Debería adjuntar observadores evitando duplicados, y eliminarlos correctamente', () => {
    // Creamos un Mock de un Observer
    const mockObserver: Observer = { update: vi.fn() };

    // Acción: adjuntamos el mismo observador dos veces
    notifier.attach(mockObserver);
    notifier.attach(mockObserver);

    // Verificacion: Accedemos a la propiedad privada usando un cast (any) para confirmar que el array no admitió el duplicado.
    expect((notifier as any).observers).toHaveLength(1);

    // Accion: Eliminamos el observador
    notifier.detach(mockObserver);

    // Verificacion
    expect((notifier as any).observers).toHaveLength(0);
  });

  it('Distribución de Mensajes: Debería iterar e invocar el método update() de todos los observadores registrados', async () => {
    // Mocks de multiples observadores
    const obs1: Observer = { update: vi.fn().mockResolvedValue(undefined) };
    const obs2: Observer = { update: vi.fn().mockResolvedValue(undefined) };

    notifier.attach(obs1);
    notifier.attach(obs2);

    const payloadDummy = { post: { id: 1 }, destinatarios: [1, 2] };

    // Accion: Notificamos a todos
    await notifier.notify(payloadDummy);

    // Verificacion: Ambos debieron ser llamados con la instancia del notifier y los datos
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
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    // Accion y Verificacion: notify NO debe arrojar un error ("resolves.not.toThrow")
    // El .catch() interno debe absorber la caída.
    await expect(notifier.notify({ post: {}, destinatarios: [] })).resolves.not.toThrow();

    // Verificacion que el error se registro en consola (se maneja de forma controlada)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[JobPostingNotifier] Error asíncrono en observer:'),
      expect.any(Error)
    );

    // Verificamos que el segundo observador SI corrio, a pesar del fallo del primero
    expect(obsExitoso.update).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

// ============================================================================
// Pruebas del Observador (InAppNotificationObserver)

describe('Patrón Observer - Pruebas de InAppNotificationObserver', () => {
  let observer: InAppNotificationObserver;
  let jobNotifier: JobPostingNotifier;
  let messageNotifier: MessageNotifier;

  // Variable para simular el cliente devuelto por Supabase
  let mockSupabaseClient: any;

  beforeEach(async () => {
    // Mock completo encadenable para simular `client.from().insert()`
    mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    // Mock del servicio de Supabase
    const mockSupabaseService = {
      getClient: vi.fn().mockReturnValue(mockSupabaseClient),
    };

    // Construccion del Modulo de Pruebas nativo de NestJS
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

    // Accion: Simulamos que la alerta llega desde el Notificador de Trabajos
    await observer.update(jobNotifier, payload);

    // Verificacion
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('notificaciones');
    expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id_usuario: 99,
          titulo: 'Nuevo trabajo en tu rubro',
          seccion_destino: 'FORO', // Logica de negocio clave validada
        })
      ])
    );
  });

  it('Discriminación de Contexto (MessageNotifier): Debería generar el payload para MENSAJERIA', async () => {
    const payload = {
      message: { id_mensaje: 5 },
      destinatarios: [{ id_usuario: 88, tipo_usuario: 'CLIENT' }],
    };

    // Accion: Simulamos que la alerta llega desde el Notificador de Mensajes
    await observer.update(messageNotifier, payload);

    // Verificacion
    expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id_usuario: 88,
          seccion_destino: 'MENSAJERIA', // Logica de negocio clave validada
        })
      ])
    );
  });
});


