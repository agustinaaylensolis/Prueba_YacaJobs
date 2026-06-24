import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobsService } from '../../backend/src/jobs/jobs.service';
import { SupabaseService } from '../../backend/src/supabase/supabase.service';
import { JobPostingNotifier } from '../../backend/src/jobs/observers/job-posting.notifier';
import { MessageNotifier } from '../../backend/src/jobs/observers/message.notifier';
import { ContractNotifier } from '../../backend/src/jobs/observers/contract.notifier';
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

describe('Fase 5: Finalización y Calificación (JobsService)', () => {
  let service: JobsService;
  let mockSupabaseClient: any;

  beforeEach(async () => {
    const entorno = await crearServicioConMock();
    service = entorno.service;
    mockSupabaseClient = entorno.mockSupabaseClient;
  });

  it('TC-09: ERROR - Intento de calificación sin que el contrato esté "Confirmada"', async () => {
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id_cliente: 1, id_trabajador: 2 }, error: null }); 
    mockSupabaseClient.maybeSingle.mockResolvedValueOnce({ data: { id_contratacion: 10, estado_contratacion: 'Pendiente' }, error: null });

    const payload = { puntuacion: 5, id_emisor_cliente: 1, id_receptor_trabajador: 2 };
    
    // Ejecución y Aserción
    await expect(service.submitRatingAndFinalize(1, payload))
      .rejects.toThrow('Solo se pueden calificar contratos que estén confirmados');
  });

  it('TC-10: ÉXITO - Calificación normal inserta mensaje de cierre "[TRABAJO FINALIZADO]"', async () => {
    // 1. Validaciones
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id_cliente: 1, id_trabajador: 2, id_publi: 5 }, error: null });
    mockSupabaseClient.maybeSingle.mockResolvedValueOnce({ data: { id_contratacion: 10, estado_contratacion: 'Confirmada' }, error: null });
    mockSupabaseClient.then.mockImplementationOnce((res: any) => res({ data: [], error: null })); // Valoracion no existe
    
    // 2. Insert de valoración
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id_valoracion: 99 }, error: null });
    
    // 3. updateContractStatus interno (FINALIZE)
    mockSupabaseClient.maybeSingle
      .mockResolvedValueOnce({ data: { id_conversacion: 1 }, error: null }) 
      .mockResolvedValueOnce({ data: { id_contratacion: 10, estado_contratacion: 'Confirmada' }, error: null });
    
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id_contratacion: 10, estado_contratacion: 'Finalizada' }, error: null }) 
      .mockResolvedValueOnce({ data: { id_publi: 5 }, error: null }) 
      .mockResolvedValueOnce({ data: { id_cliente: 1, id_trabajador: 2 }, error: null }); 

    // 4. sendMessage interno
    mockSupabaseClient.maybeSingle.mockResolvedValueOnce({ data: { id_conversacion: 1 }, error: null }); 
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id_mensaje: 200 }, error: null }); 
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id_cliente: 1, id_trabajador: 2 }, error: null }); 

    const payload = { puntuacion: 5, id_emisor_cliente: 1, id_receptor_trabajador: 2 };
    
    // Ejecución
    await service.submitRatingAndFinalize(1, payload);

    // Aserciones
    expect(mockSupabaseClient.update).toHaveBeenCalledWith(expect.objectContaining({ estado_contratacion: 'Finalizada' }));
    
    // Inserción del mensaje automático
    expect(mockSupabaseClient.insert).toHaveBeenCalledWith(expect.objectContaining({
      contenido_mensaje: expect.stringContaining('[TRABAJO FINALIZADO]')
    }));
  });
});
