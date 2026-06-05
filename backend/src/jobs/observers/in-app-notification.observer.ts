import { Injectable, Inject } from '@nestjs/common';
import { Observer } from './observer.interface.js';
import { JobPostingNotifier } from './job-posting.notifier.js';
import { SupabaseService } from '../../supabase/supabase.service.js';

@Injectable()
export class InAppNotificationObserver implements Observer {
  constructor(
    @Inject(SupabaseService) private readonly supabaseService: SupabaseService,
    @Inject(JobPostingNotifier) private readonly notifier: JobPostingNotifier,
  ) {
    this.notifier.attach(this);
  }

  async update(subject: any, post: any): Promise<void> {
    if (subject instanceof JobPostingNotifier) {
      console.log(`[InAppNotificationObserver] Procesando notificaciones para nueva publicación de rubro ID: ${post.id_oficio}`);
      const client = this.supabaseService.getClient();

      // 1. Encontrar todos los trabajadores suscritos a este rubro
      const { data: workers, error } = await client
        .from('oficio_del_trabajador')
        .select('id_trabajador')
        .eq('id_oficio', post.id_oficio);

      if (error) {
        console.error('[InAppNotificationObserver] Error al buscar trabajadores:', error.message);
        return;
      }

      if (workers && workers.length > 0) {
        console.log(`[InAppNotificationObserver] Encontrados ${workers.length} trabajadores para el rubro ID: ${post.id_oficio}. Preparando notificaciones...`);
        
        const notificaciones = workers.map((worker) => ({
          id_usuario: worker.id_trabajador,
          tipo_usuario: 'WORKER',
          titulo: 'Nuevo trabajo en tu rubro',
          mensaje: 'Se ha publicado un nuevo trabajo relacionado con tu oficio. ¡Revisalo y postúlate!',
          id_publi: post.id_publi,
          leido: false,
        }));

        const { error: insertError } = await client
          .from('notificaciones')
          .insert(notificaciones);

        if (insertError) {
          console.error('[InAppNotificationObserver] Error al guardar notificaciones en la base de datos:', insertError.message);
        } else {
          console.log(`[InAppNotificationObserver] Se enviaron exitosamente ${notificaciones.length} notificaciones.`);
        }
      }
    }
  }
}
