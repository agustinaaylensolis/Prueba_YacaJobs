import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller.js';
import { JobsService } from './jobs.service.js';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { JobPostingNotifier } from './observers/job-posting.notifier.js';
import { EmailNotificationObserver } from './observers/email-notification.observer.js';
import { InAppNotificationObserver } from './observers/in-app-notification.observer.js';

@Module({
  imports: [SupabaseModule],
  controllers: [JobsController],
  providers: [
    JobsService,
    JobPostingNotifier,
    EmailNotificationObserver,
    InAppNotificationObserver
  ],
})
export class JobsModule {}
