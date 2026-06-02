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

export interface Rating {
  id_valoracion: number;
  puntuacion: number;
  comentario?: string | null;
  id_emisor_cliente: number;
  id_receptor_trabajador: number;
  fecha_valoracion: string;
  // Campo adicional para el nombre del cliente que hace la valoración
  nombre_cliente?: string;
}

export interface WorkerProfile extends User {
  dni: string;
  phone: string;
  hasLegalCheck: boolean;
  trades: Trade[];
  score: number;
  totalRatings: number; // Nueva propiedad para la cantidad total de valoraciones
  certifications?: string;
}
