import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobsService } from '../../backend/src/jobs/jobs.service';
import { SupabaseService } from '../../backend/src/supabase/supabase.service';
import { JobPostingNotifier } from '../../backend/src/jobs/observers/job-posting.notifier';
import { MessageNotifier } from '../../backend/src/jobs/observers/message.notifier';
import { ContractNotifier } from '../../backend/src/jobs/observers/contract.notifier';

async function crearForoServiceConMock() {
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

  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [
      JobsService,
      { provide: SupabaseService, useValue: mockSupabaseService },
      // Mocks de Notifiers para evitar llamadas reales en pruebas unitarias
      { provide: JobPostingNotifier, useValue: { notify: vi.fn() } },
      { provide: MessageNotifier, useValue: { notify: vi.fn() } },
      { provide: ContractNotifier, useValue: { notify: vi.fn() } },
    ],
  }).compile();

  return {
    service: moduleRef.get<JobsService>(JobsService),
    mockSupabaseClient
  };
}

describe('Módulo Foro: Publicar Pedido (JobsService)', () => {
  let service: JobsService;
  let mockSupabaseClient: any;

  beforeEach(async () => {
    const entorno = await crearForoServiceConMock();
    service = entorno.service;
    mockSupabaseClient = entorno.mockSupabaseClient;
  });

  it('Éxito: Debe crear una publicación correctamente asociando ID de cliente y oficio.', async () => {
    // Configuración del mock para que simule una inserción exitosa
    const mockPostData = {
      id_publi: 100,
      id_cliente: 1,
      id_oficio: 5,
      titulo: 'Necesito plomero',
      descripcion: 'Fuga de agua',
      estado_publi: 'Abierta'
    };
    mockSupabaseClient.single.mockResolvedValueOnce({ data: mockPostData, error: null });
    
    // Simular que después de publicar, busca trabajadores compatibles para notificar (JobPostingNotifier)
    mockSupabaseClient.then.mockImplementationOnce((res: any) => res({ data: [{ id_trabajador: 2 }], error: null }));

    const payload = {
      clientId: 1,
      tradeId: 5,
      title: 'Necesito plomero',
      description: 'Fuga de agua',
      urgency: 'ALTA'
    } as any;

    const result = await service.createPost(payload);

    // Aserciones
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('publicaciones');
    expect(mockSupabaseClient.insert).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({
      id_publi: 100,
      estado_publi: 'Abierta'
    }));
  });

  it('Fallo: Debe arrojar excepción si ocurre un error interno de base de datos al insertar.', async () => {
    // Configuración del mock para que simule un error en la base de datos
    mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: { message: 'Error interno de DB' } });

    const payload = {
      clientId: 1,
      tradeId: 5,
      title: 'Necesito plomero',
      description: 'Fuga de agua',
      urgency: 'ALTA'
    } as any;

    // Ejecución y Aserción
    await expect(service.createPost(payload)).rejects.toThrow();
  });
});
