import { Service, Barber, User } from './types';

export const SERVICES: Service[] = [
  { id: '1', name: 'Corte Social', description: 'Corte clássico feito com tesoura e máquina.', price: 50, duration: 45, category: 'hair' },
  { id: '2', name: 'Degradê Moderno', description: 'Corte com transição suave nas laterais.', price: 60, duration: 60, category: 'hair' },
  { id: '3', name: 'Barba Completa', description: 'Aparagem, desenho e hidratação com toalha quente.', price: 40, duration: 30, category: 'beard' },
  { id: '4', name: 'Combo Premium', description: 'Corte degradê + Barba completa + Hidratação.', price: 90, duration: 90, category: 'combo' },
  { id: '5', name: 'Pigmentação', description: 'Correção de falhas no cabelo ou barba.', price: 30, duration: 20, category: 'other' },
];

export const BARBERS: Barber[] = [
  { id: 'b1', name: 'Ricardo Silva', photo: 'https://picsum.photos/seed/barber1/200/200', specialties: ['Degradê', 'Clássico'], rating: 4.9, available: true },
  { id: 'b2', name: 'Lucas "Tesoura"', photo: 'https://picsum.photos/seed/barber2/200/200', specialties: ['Barba', 'Pigmentação'], rating: 4.8, available: true },
  { id: 'b3', name: 'Gabriel Santos', photo: 'https://picsum.photos/seed/barber3/200/200', specialties: ['Infantil', 'Moderno'], rating: 4.7, available: true },
];

export const MOCK_USER: User = {
  id: 'u1',
  name: 'João Cliente',
  email: 'joao@email.com',
  role: 'client',
  avatar: 'https://picsum.photos/seed/user1/100/100'
};

export const BUSINESS_HOURS = {
  open: 9,
  close: 19,
};
