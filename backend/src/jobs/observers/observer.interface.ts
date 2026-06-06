export interface Observer {
  update(subject: any, data: any): Promise<void>;
}
