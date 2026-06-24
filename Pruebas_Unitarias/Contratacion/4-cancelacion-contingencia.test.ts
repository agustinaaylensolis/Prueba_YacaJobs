import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobsService } from '../../backend/src/jobs/jobs.service';
import { SupabaseService } from '../../backend/src/supabase/supabase.service';
import { JobPostingNotifier } from '../../backend/src/jobs/observers/job-posting.notifier';
import { MessageNotifier } from '../../backend/src/jobs/observers/message.notifier';
import { ContractNotifier } from '../../backend/src/jobs/observers/contract.notifier';
import { ContractAction } from '../../backend/src/jobs/dto/update-contract-status.dto';
import { BadRequestException } from '@nestjs/common';

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

  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [
      JobsService,
      { provide: SupabaseService, useValue: { getClient: vi.fn().mockReturnValue(mockSupabaseClient) } },
      { provide: JobPostingNotifier, useValue: { notify: vi.fn() } },
      { provide: MessageNotifier, useValue: { notify: vi.fn() } },
      { provide: ContractNotifier, useValue: { notify: vi.fn() } },
    ],
  }).compile();

  return { service: moduleRef.get<JobsService>(JobsService), mockSupabaseClient };
}

describe('Fase 4: Cancelación y Contingencia (JobsService)', () => {
  let service: JobsService;
  let mockSupabaseClient: any;

  beforeEach(async () => {
    const entorno = await crearServicioConMock();
    service = entorno.service;
    mockSupabaseClient = entorno.mockSupabaseClient;
  });

  it('TC-07: ERROR - Debe rechazar la cancelación si falta menos de 1 hora para el trabajo', async () => {
    // Calculamos una fecha a 30 minutos de AHORA
    const fechaCritica = new Date(Date.now() + 30 * 60 * 1000).toISOString(); 

    mockSupabaseClient.maybeSingle
      .mockResolvedValueOnce({ data: { id_conversacion: 1 }, error: null }) // acceso
      .mockResolvedValueOnce({ 
        data: { id_contratacion: 10, estado_contratacion: 'Confirmada', fecha_horario_acordado: fechaCritica }, 
        error: null 
      });

    // Ejecución y Aserción
    await expect(service.updateContractStatus(1, { action: ContractAction.CANCEL_CONFIRMED, actorRole: 'CLIENT', actorId: 1 }))
      .rejects.toThrow(BadRequestException);
  });

  it('TC-08: ÉXITO - Debe permitir la cancelación si falta más de 1 hora y pasar a "Cancelada"', async () => {
    // Calculamos una fecha a 2 horas de AHORA
    const fechaSegura = new Date(Date.now() + 120 * 60 * 1000).toISOString(); 

    mockSupabaseClient.maybeSingle
      .mockResolvedValueOnce({ data: { id_conversacion: 1 }, error: null })
      .mockResolvedValueOnce({ 
        data: { id_contratacion: 10, estado_contratacion: 'Confirmada', fecha_horario_acordado: fechaSegura }, 
        error: null 
      });
      
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id_contratacion: 10, estado_contratacion: 'Cancelada' }, error: null })
      .mockResolvedValueOnce({ data: { id_cliente: 1, id_trabajador: 2 }, error: null });

    // Ejecución
    await service.updateContractStatus(1, { action: ContractAction.CANCEL_CONFIRMED, actorRole: 'CLIENT', actorId: 1 });

    // Aserción
    expect(mockSupabaseClient.update).toHaveBeenCalledWith(expect.objectContaining({ estado_contratacion: 'Cancelada' }));
  });
});
