export enum UserRole {
  CLIENT = 'CLIENT',
  WORKER = 'WORKER',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface Trade {
  id: number;
  name: string;
  specialty?: string;
}

export interface JobPublication {
  id: number;
  ownerId: string;
  tradeId: number;
  urgency: 'Alta' | 'Media' | 'Baja';
  description: string;
  createdAt: string;
  status: 'Abierta' | 'Cerrada' | 'En Proceso';
}

export interface Proposal {
  id: number;
  publicationId: number;
  workerId: string;
  budget: number;
  materials?: string;
  description: string;
  createdAt: string;
}

export interface WorkerProfile extends User {
  dni: string;
  phone: string;
  hasLegalCheck: boolean;
  trades: Trade[];
  score: number;
  certifications?: string;
}
