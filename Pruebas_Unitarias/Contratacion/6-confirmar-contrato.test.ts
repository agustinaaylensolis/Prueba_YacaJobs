import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobsService } from '../../backend/src/jobs/jobs.service';
import { SupabaseService } from '../../backend/src/supabase/supabase.service';
import { JobPostingNotifier } from '../../backend/src/jobs/observers/job-posting.notifier';
import { MessageNotifier } from '../../backend/src/jobs/observers/message.notifier';
import { ContractNotifier } from '../../backend/src/jobs/observers/contract.notifier';
import { ContractAction } from '../../backend/src/jobs/dto/update-contract-status.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

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

  return { service: moduleRef.get<JobsService>(JobsService), mockSupabaseClient };
}

describe('Fase 3: Confirmación - Casos Límite (JobsService)', () => {
  let service: JobsService;
  let mockSupabaseClient: any;

  beforeEach(async () => {
    const entorno = await crearServicioConMock();
    service = entorno.service;
    mockSupabaseClient = entorno.mockSupabaseClient;
  });

  it('Límite: Debe arrojar error si se intenta confirmar con un ID de propuesta inexistente.', async () => {
    // Simulamos que maybeSingle() no encuentra nada para el contrato
    mockSupabaseClient.maybeSingle
      .mockResolvedValueOnce({ data: { id_conversacion: 1 }, error: null }) // acceso correcto
      .mockResolvedValueOnce({ data: null, error: null }); // contrato NO existe

    await expect(service.updateContractStatus(1, { action: ContractAction.CONFIRM, actorRole: 'CLIENT', actorId: 1 }))
      .rejects.toThrow();
  });

  it('Límite: Debe impedir la confirmación de una propuesta que ya se encuentra en estado Confirmada previamente.', async () => {
    mockSupabaseClient.maybeSingle
      .mockResolvedValueOnce({ data: { id_conversacion: 1 }, error: null }) // acceso correcto
      .mockResolvedValueOnce({ data: { id_contratacion: 10, estado_contratacion: 'Confirmada' }, error: null }); // contrato ya Confirmado

    await expect(service.updateContractStatus(1, { action: ContractAction.CONFIRM, actorRole: 'CLIENT', actorId: 1 }))
      .rejects.toThrow();
  });

  it('Límite: Debe impedir la confirmación de una propuesta que se encuentra en estado Cancelada.', async () => {
    mockSupabaseClient.maybeSingle
      .mockResolvedValueOnce({ data: { id_conversacion: 1 }, error: null }) // acceso correcto
      .mockResolvedValueOnce({ data: { id_contratacion: 10, estado_contratacion: 'Cancelada' }, error: null }); // contrato Cancelado

    await expect(service.updateContractStatus(1, { action: ContractAction.CONFIRM, actorRole: 'CLIENT', actorId: 1 }))
      .rejects.toThrow();
  });
});
