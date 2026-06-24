import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobsService } from '../../backend/src/jobs/jobs.service';
import { SupabaseService } from '../../backend/src/supabase/supabase.service';
import { JobPostingNotifier } from '../../backend/src/jobs/observers/job-posting.notifier';
import { MessageNotifier } from '../../backend/src/jobs/observers/message.notifier';
import { ContractNotifier } from '../../backend/src/jobs/observers/contract.notifier';
import { ContractAction } from '../../backend/src/jobs/dto/update-contract-status.dto';

/**
 * Función auxiliar para instanciar el servicio y generar mocks limpios.
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

  const mockJobPostingNotifier = { notify: vi.fn() };

  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [
      JobsService,
      { provide: SupabaseService, useValue: { getClient: vi.fn().mockReturnValue(mockSupabaseClient) } },
      { provide: JobPostingNotifier, useValue: mockJobPostingNotifier },
      { provide: MessageNotifier, useValue: { notify: vi.fn() } },
      { provide: ContractNotifier, useValue: { notify: vi.fn() } },
    ],
  }).compile();

  return { service: moduleRef.get<JobsService>(JobsService), mockSupabaseClient, mockJobPostingNotifier };
}

describe('Fase 3: Decisión del Cliente (JobsService)', () => {
  let service: JobsService;
  let mockSupabaseClient: any;
  let mockJobPostingNotifier: any;

  beforeEach(async () => {
    const entorno = await crearServicioConMock();
    service = entorno.service;
    mockSupabaseClient = entorno.mockSupabaseClient;
    mockJobPostingNotifier = entorno.mockJobPostingNotifier;
  });

  it('TC-05: CONFIRM - Debe pasar a "Confirmada", cerrar chat, y notificar exclusividad (foro)', async () => {
    // Configuración del mock
    mockSupabaseClient.maybeSingle
      .mockResolvedValueOnce({ data: { id_conversacion: 1 }, error: null }) // assert acceso
      .mockResolvedValueOnce({ data: { id_contratacion: 10 }, error: null }); // existe contrato
      
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id_contratacion: 10, estado_contratacion: 'Confirmada' }, error: null })
      .mockResolvedValueOnce({ data: { id_publi: 5, id_trabajador: 2 }, error: null }) // es de foro (tiene id_publi)
      .mockResolvedValueOnce({ data: { id_cliente: 1, id_trabajador: 2 }, error: null });

    // Raw awaits internos
    mockSupabaseClient.then.mockImplementationOnce((res: any) => res({ data: null, error: null })); // update publi
    mockSupabaseClient.then.mockImplementationOnce((res: any) => 
      res({ data: [{ id_trabajador: 3 }], error: null }) // otros postulados
    );

    // Ejecución
    await service.updateContractStatus(1, { action: ContractAction.CONFIRM, actorRole: 'CLIENT', actorId: 1 });

    // Aserciones
    expect(mockSupabaseClient.update).toHaveBeenCalledWith(expect.objectContaining({ estado_contratacion: 'Confirmada' }));
    expect(mockSupabaseClient.update).toHaveBeenCalledWith(expect.objectContaining({ estado_conversacion: 'Cerrada' }));
    expect(mockSupabaseClient.update).toHaveBeenCalledWith(expect.objectContaining({ estado_publi: 'En curso' }));
    expect(mockJobPostingNotifier.notify).toHaveBeenCalledWith(expect.objectContaining({ action: 'CLOSED' }));
  });

  it('TC-06: REJECT - Debe pasar a "Rechazada" y cerrar el chat inmediatamente', async () => {
    mockSupabaseClient.maybeSingle
      .mockResolvedValueOnce({ data: { id_conversacion: 1 }, error: null })
      .mockResolvedValueOnce({ data: { id_contratacion: 10 }, error: null });
      
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id_contratacion: 10, estado_contratacion: 'Rechazada' }, error: null })
      .mockResolvedValueOnce({ data: { id_cliente: 1, id_trabajador: 2 }, error: null });

    await service.updateContractStatus(1, { action: ContractAction.REJECT, actorRole: 'CLIENT', actorId: 1 });

    expect(mockSupabaseClient.update).toHaveBeenCalledWith(expect.objectContaining({ estado_contratacion: 'Rechazada' }));
    expect(mockSupabaseClient.update).toHaveBeenCalledWith(expect.objectContaining({ estado_conversacion: 'Cerrada' }));
  });
});
