import { Injectable, Inject } from '@nestjs/common';
import { Observer } from './observer.interface.js';
import { JobPostingNotifier } from './job-posting.notifier.js';
import { SupabaseService } from '../../supabase/supabase.service.js';

@Injectable()
export class EmailNotificationObserver implements Observer {
  constructor(
    @Inject(SupabaseService) private readonly supabaseService: SupabaseService,
    @Inject(JobPostingNotifier) private readonly notifier: JobPostingNotifier,
  ) {
    this.notifier.attach(this);
  }

  async update(subject: any, post: any): Promise<void> {
    if (subject instanceof JobPostingNotifier) {
      console.log(`[EmailNotificationObserver] Preparando correos para nueva publicación ID: ${post.id_publi || post.id}`);
      
      const client = this.supabaseService.getClient();
      const { data: workers, error } = await client
        .from('oficio_del_trabajador')
        .select('id_trabajador')
        .eq('id_oficio', post.id_oficio);

      if (error || !workers) return;

      for (const worker of workers) {
        // Simulación de envío de correo
        console.log(`[EmailNotificationObserver] -> Enviando email al trabajador ID: ${worker.id_trabajador} por el trabajo ID: ${post.id_publi || post.id}`);
      }
    }
  }
}
