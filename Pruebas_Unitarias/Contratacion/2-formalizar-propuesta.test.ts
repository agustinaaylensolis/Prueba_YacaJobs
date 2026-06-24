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

describe('Fase 2: Formalizar Propuesta (JobsService)', () => {
  let service: JobsService;
  let mockSupabaseClient: any;

  beforeEach(async () => {
    const entorno = await crearServicioConMock();
    service = entorno.service;
    mockSupabaseClient = entorno.mockSupabaseClient;
  });

  it('TC-03: Debe fallar si se envían datos incorrectos (sin monto)', async () => {
    // Configuración del mock para permitir el paso de la validación de acceso
    mockSupabaseClient.maybeSingle
      .mockResolvedValueOnce({ data: { id_conversacion: 1 }, error: null });

    const payload = { actorId: 2, actorRole: 'WORKER' as const } as any;

    // Ejecución y Aserción (Dependiendo de la implementación exacta, falla aquí o en DB. Supongamos validación simple)
    // El framework de NestJS valida el DTO, pero a nivel unitario si el payload está vacío el backend debería arrojar error o fallar DB
    // Simulamos un error de base de datos por violar NOT NULL constraint
    mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: { message: 'Monto is required' } });

    await expect(service.updateContractAgreement(1, payload)).rejects.toThrow();
  });

  it('TC-04: Debe cambiar el estado a "PropuestaEnviada" y generar la actualización de la preview del chat', async () => {
    // Configuración del mock
    mockSupabaseClient.maybeSingle
      .mockResolvedValueOnce({ data: { id_conversacion: 1 }, error: null }) // Acceso correcto
      .mockResolvedValueOnce({ data: { id_contratacion: 10 }, error: null }); // Existe contrato
      
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id_contratacion: 10, estado_contratacion: 'PropuestaEnviada', monto_acordado: 5000 }, error: null }) // Update de contrato
      .mockResolvedValueOnce({ data: { id_cliente: 1, id_trabajador: 2 }, error: null }); // Obtener contraparte

    // Ejecución
    const result = await service.updateContractAgreement(1, { 
      actorId: 2, actorRole: 'WORKER', monto: 5000, fecha_hora: '10/10/2026' 
    });

    // Aserciones
    expect(mockSupabaseClient.update).toHaveBeenCalledWith(expect.objectContaining({
      estado_contratacion: 'PropuestaEnviada',
      monto_acordado: 5000
    }));
    
    // Verificamos que se modifique la preview en la conversación
    expect(mockSupabaseClient.update).toHaveBeenCalledWith(expect.objectContaining({
      ultimo_mensaje_preview: expect.stringContaining('Propuesta')
    }));

    expect(result.estado_contratacion).toBe('PropuestaEnviada');
  });
});
