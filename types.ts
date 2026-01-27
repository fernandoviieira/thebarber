
export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  category: 'hair' | 'beard' | 'combo' | 'other';
}

export interface Barber {
  id: string;
  name: string;
  photo: string;
  specialties: string[];
  rating: number;
  available: boolean;
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  barberId: string;
  serviceIds: string[];
  date: string; // ISO string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  totalPrice: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'admin' | 'barber';
  avatar?: string;
}

export interface DailyReport {
  totalRevenue: number;
  appointmentsCount: number;
  popularServices: { name: string; count: number }[];
}
