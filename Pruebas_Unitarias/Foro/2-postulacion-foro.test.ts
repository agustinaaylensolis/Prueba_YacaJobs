import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobsService } from '../../backend/src/jobs/jobs.service';
import { SupabaseService } from '../../backend/src/supabase/supabase.service';
import { JobPostingNotifier } from '../../backend/src/jobs/observers/job-posting.notifier';
import { MessageNotifier } from '../../backend/src/jobs/observers/message.notifier';
import { ContractNotifier } from '../../backend/src/jobs/observers/contract.notifier';
import { BadRequestException } from '@nestjs/common';

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

describe('Módulo Foro: Postulación a Publicación (JobsService)', () => {
  let service: JobsService;
  let mockSupabaseClient: any;

  beforeEach(async () => {
    const entorno = await crearForoServiceConMock();
    service = entorno.service;
    mockSupabaseClient = entorno.mockSupabaseClient;
  });

  it('Éxito: Debe registrar la postulación correctamente si la publicación está abierta.', async () => {
    // 2. Verificación de publicación (retorna una publi Abierta)
    mockSupabaseClient.maybeSingle.mockResolvedValueOnce({ 
      data: { id_publi: 10, estado_publi: 'Abierta', id_cliente: 1 }, 
      error: null 
    });

    // 3. Inserción de la postulación
    mockSupabaseClient.single.mockResolvedValueOnce({ 
      data: { id_postulacion: 50, id_publi: 10, id_trabajador: 2 }, 
      error: null 
    });

    const payload = {
      id_publi: 10,
      id_trabajador: 2,
      presupuesto: 5000,
      descripcion: 'Puedo hacerlo mañana',
      materiales: 'Ninguno especial'
    } as any;

    const result = await service.postulate(payload);

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('postulaciones');
    expect(mockSupabaseClient.insert).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({
      id_postulacion: 50
    }));
  });

  it('Fallo Crítico: Debe rechazar la postulación si la publicación ya fue cerrada o contratada.', async () => {
    // 2. Verificación de publicación (retorna una publi Cerrada o En curso)
    mockSupabaseClient.maybeSingle.mockResolvedValueOnce({ 
      data: { id_publi: 10, estado_publi: 'Cerrada', id_cliente: 1 }, 
      error: null 
    });

    const payload = {
      id_publi: 10,
      id_trabajador: 2,
      presupuesto: 5000,
      descripcion: 'Intento de postulación',
      materiales: ''
    } as any;

    // Ejecución y Aserción
    await expect(service.postulate(payload)).rejects.toThrow(BadRequestException);
    
    // Volvemos a configurar el mock para validar el error con regex por si acaso en la 2da aserción
    mockSupabaseClient.maybeSingle.mockResolvedValueOnce({ 
      data: { id_publi: 10, estado_publi: 'En curso', id_cliente: 1 }, 
      error: null 
    });
    
    await expect(service.postulate(payload)).rejects.toThrow(/abierta/i);
  });
});
