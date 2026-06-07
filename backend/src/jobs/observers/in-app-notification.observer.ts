import { Injectable, Inject } from '@nestjs/common';
import { Observer } from './observer.interface.js';
import { JobPostingNotifier } from './job-posting.notifier.js';
import { MessageNotifier } from './message.notifier.js';
import { ContractNotifier } from './contract.notifier.js';
import { SupabaseService } from '../../supabase/supabase.service.js';

@Injectable()
export class InAppNotificationObserver implements Observer {
  constructor(
    @Inject(SupabaseService) private readonly supabaseService: SupabaseService,
    @Inject(JobPostingNotifier) private readonly jobNotifier: JobPostingNotifier,
    @Inject(MessageNotifier) private readonly messageNotifier: MessageNotifier,
    @Inject(ContractNotifier) private readonly contractNotifier: ContractNotifier,
  ) {
    this.jobNotifier.attach(this);
    this.messageNotifier.attach(this);
    this.contractNotifier.attach(this);
  }

  async update(subject: any, payload: any): Promise<void> {
    const client = this.supabaseService.getClient();
    let notificaciones: any[] = [];

    // Validar destinatarios pre-calculados (Solución a N+1)
    if (!payload.destinatarios || payload.destinatarios.length === 0) {
      return;
    }

    if (subject instanceof JobPostingNotifier) {
      const { post, destinatarios } = payload;
      notificaciones = destinatarios.map((id_usuario: number) => ({
        id_usuario,
        tipo_usuario: 'WORKER',
        titulo: 'Nuevo trabajo en tu rubro',
        mensaje: 'Se ha publicado un nuevo trabajo relacionado con tu oficio. ¡Revisalo y postúlate!',
        id_publi: post.id_publi || post.id,
        leido: false,
        seccion_destino: 'FORO', // Redirige a Foro
      }));
    } else if (subject instanceof MessageNotifier) {
      const { message, destinatarios } = payload;
      notificaciones = destinatarios.map((dest: { id_usuario: number; tipo_usuario: string }) => ({
        id_usuario: dest.id_usuario,
        tipo_usuario: dest.tipo_usuario,
        titulo: 'Nuevo mensaje recibido',
        mensaje: 'Tienes un nuevo mensaje en tu conversación.',
        leido: false,
        seccion_destino: 'MENSAJERIA', // Redirige a Mensajería
      }));
    } else if (subject instanceof ContractNotifier) {
      const { contract, action, destinatarios } = payload;
      let titulo = 'Actualización de contrato';
      let mensaje = 'Hubo un cambio en tu trato.';
      
      if (action === 'CONFIRM') {
        titulo = 'Contrato Confirmado';
        mensaje = 'El cliente ha aceptado tu propuesta.';
      } else if (action === 'CANCEL_CONFIRMED' || action === 'CANCEL_PROPOSAL' || action === 'CANCEL_INTENT') {
        titulo = 'Contrato Cancelado';
        mensaje = 'La contratación ha sido cancelada o rechazada.';
      } else if (action === 'AGREEMENT_SENT') {
        titulo = 'Nueva Propuesta Recibida';
        mensaje = 'El trabajador te ha enviado una propuesta detallada.';
      } else if (action === 'INTENT') {
        titulo = 'Intención de Contratación';
        mensaje = 'El cliente quiere avanzar con una propuesta tuya.';
      }

      notificaciones = destinatarios.map((dest: { id_usuario: number; tipo_usuario: string }) => ({
        id_usuario: dest.id_usuario,
        tipo_usuario: dest.tipo_usuario,
        titulo,
        mensaje,
        leido: false,
        // Al cliente le aparece en Mis Pedidos, al trabajador le podría aparecer en Foro o Pedidos.
        // Dado que el cliente tiene 'PEDIDOS' y el trabajador no (solo FORO), enviaremos a 'PEDIDOS'
        // para el cliente, y 'FORO' (u otra genérica) para el trabajador si aplica.
        // El enunciado dice "Mis Pedidos" para el cliente y "Foro" para el trabajador.
        seccion_destino: dest.tipo_usuario === 'CLIENT' ? 'PEDIDOS' : 'MENSAJERIA',
      }));
    }

    if (notificaciones.length > 0) {
      const { error: insertError } = await client
        .from('notificaciones')
        .insert(notificaciones);

      if (insertError) {
        console.error('[InAppNotificationObserver] Error al guardar notificaciones:', insertError.message);
      } else {
        console.log(`[InAppNotificationObserver] Se insertaron ${notificaciones.length} notificaciones con éxito.`);
      }
    }
  }
}
