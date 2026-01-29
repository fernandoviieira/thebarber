import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  price: number;
  status: 'pendente' | 'confirmado';
  payment_method?: string;
  barbershop_id: string;
  user_id?: string;
  duration?: number;
}

interface BookingContextType {
  appointments: Appointment[];
  addAppointment: (appointment: Omit<Appointment, 'id'>) => Promise<void>;
  updateStatus: (id: string, status: 'pendente' | 'confirmado') => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  fetchAppointments: (barbershopId?: string) => Promise<void>;
  loading: boolean;
}

const timeToMinutes = (t: string) => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = async (barbershopId?: string) => {
    try {
      setLoading(true);
      let query = supabase.from('appointments').select('*');

      if (barbershopId) {
        query = query.eq('barbershop_id', barbershopId);
      }

      const { data, error } = await query
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;

      const formattedData = data.map((app: any) => ({
        id: app.id,
        customerName: app.customer_name,
        customerPhone: app.customer_phone,
        service: app.service,
        barber: app.barber,
        date: app.date,
        time: app.time,
        price: Number(app.price),
        status: app.status as 'pendente' | 'confirmado',
        barbershop_id: app.barbershop_id,
        payment_method: app.payment_method,
        user_id: app.user_id,
        duration: app.duration
      }));

      setAppointments(formattedData);
    } catch (err) {
      console.error("Erro ao carregar agendamentos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const addAppointment = async (data: Omit<Appointment, 'id'>) => {
    try {
      const { data: existingApp, error: checkError } = await supabase
        .from('appointments')
        .select('id')
        .eq('barber', data.barber)
        .eq('date', data.date)
        .eq('time', data.time)
        .eq('barbershop_id', data.barbershop_id)
        .neq('status', 'cancelado'); 

      if (checkError) throw checkError;

      if (existingApp && existingApp.length > 0) {
        alert(`Indisponível: O barbeiro ${data.barber} já possui um agendamento às ${data.time} no dia selecionado.`);
        return;
      }

      if (data.status !== 'confirmado') {
        const { data: barberData, error: barberError } = await supabase
          .from('barbers')
          .select('work_days')
          .eq('name', data.barber)
          .eq('barbershop_id', data.barbershop_id);

        if (barberError) throw barberError;
        
        const barberInfo = barberData?.[0];

        if (barberInfo?.work_days) {
          const [year, month, day] = data.date.split('-').map(Number);
          const dateObj = new Date(year, month - 1, day);
          const dayOfWeek = dateObj.getDay().toString();
          const dayConfig = barberInfo.work_days[dayOfWeek];

          if (!dayConfig || !dayConfig.active) {
            alert(`O barbeiro ${data.barber} não atende neste dia da semana.`);
            return;
          }

          const currentMin = timeToMinutes(data.time);
          const startMin = timeToMinutes(dayConfig.start);
          const endMin = timeToMinutes(dayConfig.end);

          if (currentMin < startMin || currentMin >= endMin) {
            alert(`Horário fora da jornada: ${data.barber} atende das ${dayConfig.start} às ${dayConfig.end}.`);
            return;
          }
        }
      }

      const { data: userData } = await supabase.auth.getUser();
      
      const { error: insertError } = await supabase
        .from('appointments')
        .insert([{
          customer_name: data.customerName,
          customer_phone: data.customerPhone || 'Balcão',
          service: data.service,
          barber: data.barber,
          date: data.date,
          time: data.time,
          price: data.price,
          status: data.status,
          barbershop_id: data.barbershop_id,
          user_id: userData.user?.id,
          duration: data.duration
        }]);

      if (insertError) throw insertError;
      
      await fetchAppointments(data.barbershop_id);
      
    } catch (err: any) {
      console.error("Erro ao adicionar:", err);
      alert(`Erro ao salvar: ${err.message}`);
    }
  };

  const updateStatus = async (id: string, status: 'pendente' | 'confirmado') => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      setAppointments(prev => prev.map(app => app.id === id ? { ...app, status } : app));
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
  };

  const deleteAppointment = async (id: string) => {
    try {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw error;
      setAppointments(prev => prev.filter(app => app.id !== id));
    } catch (err) {
      console.error("Erro ao deletar:", err);
    }
  };

  return (
    <BookingContext.Provider value={{ appointments, addAppointment, updateStatus, deleteAppointment, fetchAppointments, loading }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) throw new Error('useBooking deve ser usado dentro de um BookingProvider');
  return context;
};