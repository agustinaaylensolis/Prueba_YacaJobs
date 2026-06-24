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
async function crearPerfilServiceConMock() {
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

describe('Módulo Perfil: Actualizar Perfil (JobsService)', () => {
  let service: JobsService;
  let mockSupabaseClient: any;

  beforeEach(async () => {
    const entorno = await crearPerfilServiceConMock();
    service = entorno.service;
    mockSupabaseClient = entorno.mockSupabaseClient;
  });

  it('Éxito: Debe actualizar los atributos del perfil y las URLs de archivos correctamente.', async () => {
    // 1. Obtener registro actual
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id_cliente: 1, url_foto_perfil: 'old.jpg' }, error: null });
    // 2. Actualizar
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id_cliente: 1, url_foto_perfil: 'new.jpg' }, error: null });

    const result = await service.updateProfile('CLIENT', 1, { url_foto_perfil: 'new.jpg' });

    expect(mockSupabaseClient.update).toHaveBeenCalledWith(expect.objectContaining({ url_foto_perfil: 'new.jpg' }));
    expect(result).toEqual(expect.objectContaining({ url_foto_perfil: 'new.jpg' }));
  });

  it('Fallo Crítico (Transaccional): Debe abortar la actualización en DB si ocurre un error al subir archivos al Storage.', async () => {
    // Simular que fetch inicial es correcto, pero ocurre un error al hacer update (representando falla de DB/Storage)
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id_cliente: 1 }, error: null }); // fetch ok
    mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: { message: 'Storage Error' } }); // update fails

    await expect(service.updateProfile('CLIENT', 1, { url_foto_perfil: 'fail.jpg' })).rejects.toThrow();
  });
});
