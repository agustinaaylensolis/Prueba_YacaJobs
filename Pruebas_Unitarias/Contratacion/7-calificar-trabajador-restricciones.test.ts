import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobsService } from '../../backend/src/jobs/jobs.service';
import { SupabaseService } from '../../backend/src/supabase/supabase.service';
import { JobPostingNotifier } from '../../backend/src/jobs/observers/job-posting.notifier';
import { MessageNotifier } from '../../backend/src/jobs/observers/message.notifier';
import { ContractNotifier } from '../../backend/src/jobs/observers/contract.notifier';

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

describe('Fase 5: Calificación - Restricciones (JobsService)', () => {
  let service: JobsService;
  let mockSupabaseClient: any;

  beforeEach(async () => {
    const entorno = await crearServicioConMock();
    service = entorno.service;
    mockSupabaseClient = entorno.mockSupabaseClient;
  });

  it('Restricción DB: Debe arrojar excepción si la puntuación enviada está fuera del rango permitido (1-5).', async () => {
    // 1. Validaciones
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id_cliente: 1, id_trabajador: 2, id_publi: 5 }, error: null });
    mockSupabaseClient.maybeSingle.mockResolvedValueOnce({ data: { id_contratacion: 10, estado_contratacion: 'Confirmada' }, error: null });
    mockSupabaseClient.then.mockImplementationOnce((res: any) => res({ data: [], error: null })); // Valoracion no existe
    
    // Simular error de restricción CHECK en DB por puntuación fuera de rango
    mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: { message: 'violates check constraint "puntuacion_check"' } });

    const payload = { puntuacion: 6, id_emisor_cliente: 1, id_receptor_trabajador: 2 };
    
    await expect(service.submitRatingAndFinalize(1, payload)).rejects.toThrow();
  });

  it('Restricción DB: Debe arrojar excepción si el comentario excede el límite máximo de caracteres (500).', async () => {
    // 1. Validaciones
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id_cliente: 1, id_trabajador: 2, id_publi: 5 }, error: null });
    mockSupabaseClient.maybeSingle.mockResolvedValueOnce({ data: { id_contratacion: 10, estado_contratacion: 'Confirmada' }, error: null });
    mockSupabaseClient.then.mockImplementationOnce((res: any) => res({ data: [], error: null })); // Valoracion no existe
    
    // Simular error de base de datos por exceder longitud
    mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: { message: 'value too long for type character varying(500)' } });

    const comentarioLargo = 'a'.repeat(501);
    const payload = { puntuacion: 5, comentario: comentarioLargo, id_emisor_cliente: 1, id_receptor_trabajador: 2 };
    
    await expect(service.submitRatingAndFinalize(1, payload)).rejects.toThrow();
  });

  it('Restricción UNIQUE: Debe rechazar la calificación por duplicado devolviendo error de restricción de DB.', async () => {
    // 1. Validaciones
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id_cliente: 1, id_trabajador: 2, id_publi: 5 }, error: null });
    mockSupabaseClient.maybeSingle.mockResolvedValueOnce({ data: { id_contratacion: 10, estado_contratacion: 'Confirmada' }, error: null });
    
    // Simular que ya existe una valoración
    mockSupabaseClient.then.mockImplementationOnce((res: any) => res({ data: [{ id_valoracion: 1 }], error: null }));

    // Si la capa de servicio valida esto antes de llegar a la DB, arrojará error.
    // Si llega a la DB, simulamos un error de UNIQUE constraint en el insert (aunque tal vez no llegue a ejecutarse el insert).
    mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: { message: 'violates unique constraint' } });

    const payload = { puntuacion: 5, id_emisor_cliente: 1, id_receptor_trabajador: 2 };
    
    await expect(service.submitRatingAndFinalize(1, payload)).rejects.toThrow();
  });
});
