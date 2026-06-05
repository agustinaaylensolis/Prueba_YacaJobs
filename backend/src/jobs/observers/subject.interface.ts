import { Observer } from './observer.interface.js';

export interface Subject {
  attach(observer: Observer): void;
  detach(observer: Observer): void;
  notify(data: any): Promise<void> | void;
}
