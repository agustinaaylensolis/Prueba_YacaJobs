import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobsService } from '../../backend/src/jobs/jobs.service';
import { SupabaseService } from '../../backend/src/supabase/supabase.service';
import { JobPostingNotifier } from '../../backend/src/jobs/observers/job-posting.notifier';
import { MessageNotifier } from '../../backend/src/jobs/observers/message.notifier';
import { ContractNotifier } from '../../backend/src/jobs/observers/contract.notifier';

/**
 * Funcion auxiliar para instanciar el servicio y generar mocks limpios.
 * Ideal para mantener el aislamiento entre pruebas en entornos académicos.
 */
async function crearServicioConMock() {
  const mockSupabaseClient = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    not: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => resolve({ data: null, error: null })),
  };

  const mockSupabaseService = { getClient: vi.fn().mockReturnValue(mockSupabaseClient) };
  const mockJobPostingNotifier = { notify: vi.fn() };
  const mockMessageNotifier = { notify: vi.fn() };
  const mockContractNotifier = { notify: vi.fn() };

  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [
      JobsService,
      { provide: SupabaseService, useValue: mockSupabaseService },
      { provide: JobPostingNotifier, useValue: mockJobPostingNotifier },
      { provide: MessageNotifier, useValue: mockMessageNotifier },
      { provide: ContractNotifier, useValue: mockContractNotifier },
    ],
  }).compile();

  return {
    service: moduleRef.get<JobsService>(JobsService),
    mockSupabaseClient,
    mockMessageNotifier
  };
}

describe('Fase 1: Apertura y Negociación (JobsService)', () => {
  let service: JobsService;
  let mockSupabaseClient: any;
  let mockMessageNotifier: any;

  beforeEach(async () => {
    const entorno = await crearServicioConMock();
    service = entorno.service;
    mockSupabaseClient = entorno.mockSupabaseClient;
    mockMessageNotifier = entorno.mockMessageNotifier;
  });

  it('TC-01: Debe disparar silenciosamente ensureContract y crear un contrato "Pendiente"', async () => {
    // Configuración del mock
    mockSupabaseClient.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null }) // La conversación no existe
      .mockResolvedValueOnce({ data: null, error: null }) // El contrato no existe
      .mockResolvedValueOnce({ data: null, error: null }); // Perfil trabajador

    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id_conversacion: 1, id_cliente: 1, id_trabajador: 2 }, error: null }) // Insert conv
      .mockResolvedValueOnce({ data: { id_contratacion: 10, estado_contratacion: 'Pendiente' }, error: null }); // Insert contrato

    // Ejecución
    const result = await service.openConversation({ clientId: 1, workerId: 2, publicationId: 5 });

    // Aserciones
    expect(mockSupabaseClient.insert).toHaveBeenCalledWith(expect.objectContaining({
      estado_contratacion: 'Pendiente'
    }));
    expect(result.contract.estado_contratacion).toBe('Pendiente');
  });

  it('TC-02: Debe enviar un mensaje y notificar al usuario receptor mediante MessageNotifier', async () => {
    // Configuración del mock
    mockSupabaseClient.maybeSingle.mockResolvedValueOnce({ data: { id_conversacion: 1 }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id_mensaje: 100 }, error: null })
      .mockResolvedValueOnce({ data: { id_cliente: 1, id_trabajador: 2 }, error: null });

    // Ejecución
    await service.sendMessage(1, { senderId: 1, senderRole: 'CLIENT', content: '¿Qué tal el presupuesto?' });

    // Aserciones
    expect(mockSupabaseClient.insert).toHaveBeenCalledWith(expect.objectContaining({
      contenido_mensaje: '¿Qué tal el presupuesto?'
    }));
    expect(mockMessageNotifier.notify).toHaveBeenCalled();
  });
});
