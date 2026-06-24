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
async function crearBuscadorServiceConMock() {
  const mockSupabaseClient = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
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

describe('Módulo Buscador: Búsqueda Directa (JobsService)', () => {
  let service: JobsService;
  let mockSupabaseClient: any;

  beforeEach(async () => {
    const entorno = await crearBuscadorServiceConMock();
    service = entorno.service;
    mockSupabaseClient = entorno.mockSupabaseClient;
  });

  it('Éxito: Debe devolver una lista ordenada de trabajadores al buscar por un oficio válido.', async () => {
    const trabajadoresMock = [
      { id_trabajador: 1, puntuacion: 5 },
      { id_trabajador: 2, puntuacion: 4 }
    ];

    mockSupabaseClient.then.mockImplementationOnce((res: any) => res({ data: trabajadoresMock, error: null }));

    const result = await service.getWorkers(1);

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('trabajadores');
    expect(result).toEqual(trabajadoresMock);
  });

  it('Fallo: Debe manejar correctamente el error al ingresar un oficio inválido o presentarse una caída de red.', async () => {
    mockSupabaseClient.then.mockImplementationOnce((res: any) => res({ data: null, error: { message: 'Error de conexión' } }));

    await expect(service.getWorkers(99)).rejects.toThrow();
  });
});
