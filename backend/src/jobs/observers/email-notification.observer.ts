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

  async update(subject: any, payload: any): Promise<void> {
    if (subject instanceof JobPostingNotifier) {
      const { post, destinatarios } = payload;
      
      if (!destinatarios || destinatarios.length === 0) return;

      console.log(`[EmailNotificationObserver] Preparando correos para nueva publicación ID: ${post.id_publi || post.id}`);
      
      for (const id_trabajador of destinatarios) {
        // Simulación de envío de correo
        console.log(`[EmailNotificationObserver] -> Enviando email al trabajador ID: ${id_trabajador} por el trabajo ID: ${post.id_publi || post.id}`);
      }
    }
  }
}
