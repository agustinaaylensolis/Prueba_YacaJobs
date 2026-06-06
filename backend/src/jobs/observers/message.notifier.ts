import { Injectable } from '@nestjs/common';
import { Subject } from './subject.interface.js';
import { Observer } from './observer.interface.js';

@Injectable()
export class MessageNotifier implements Subject {
  private observers: Observer[] = [];

  attach(observer: Observer): void {
    const isExist = this.observers.includes(observer);
    if (!isExist) {
      this.observers.push(observer);
    }
  }

  detach(observer: Observer): void {
    const observerIndex = this.observers.indexOf(observer);
    if (observerIndex !== -1) {
      this.observers.splice(observerIndex, 1);
    }
  }

  async notify(data: { message: any; destinatarios: any[] }): Promise<void> {
    for (const observer of this.observers) {
      try {
        observer.update(this, data).catch((err: any) => {
          console.error('[MessageNotifier] Error asíncrono en observer:', err);
        });
      } catch (err: any) {
        console.error('[MessageNotifier] Error síncrono al iniciar observer:', err);
      }
    }
  }
}
