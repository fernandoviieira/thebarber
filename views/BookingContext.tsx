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
  barbershop_id: string;
  user_id?: string;
}

interface BookingContextType {
  appointments: Appointment[];
  addAppointment: (appointment: Omit<Appointment, 'id'>) => Promise<void>;
  updateStatus: (id: string, status: 'pendente' | 'confirmado') => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  fetchAppointments: (barbershopId?: string) => Promise<void>; // Adicionada a prop opcional
  loading: boolean;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // AJUSTE: fetchAppointments agora aceita um ID para filtrar (essencial para o Admin)
  const fetchAppointments = async (barbershopId?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('appointments')
        .select('*');

      // Se passarmos o ID (vinda do AdminDashboard), filtramos pesado
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
        user_id: app.user_id
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
      const isManualEntry = data.status === 'confirmado';

      if (!isManualEntry) {
        const { data: barberInfo, error: barberError } = await supabase
          .from('barbers')
          .select('work_hours')
          .eq('name', data.barber)
          .eq('barbershop_id', data.barbershop_id)
          .limit(1)
          .maybeSingle(); 

        if (barberError) throw barberError;

        if (barberInfo?.work_hours) {
          const [start, end] = barberInfo.work_hours.split(' - ');
          const startH = parseInt(start.split(':')[0]);
          const endH = parseInt(end.split(':')[0]);
          const currentH = parseInt(data.time.split(':')[0]);

          if (currentH < startH || currentH >= endH) {
            alert(`O barbeiro ${data.barber} não atende neste horário. Expediente: ${barberInfo.work_hours}`);
            return; 
          }
        }

        const { data: existing, error: checkError } = await supabase
          .from('appointments')
          .select('id')
          .eq('barber', data.barber)
          .eq('date', data.date)
          .eq('time', data.time)
          .eq('barbershop_id', data.barbershop_id)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existing) {
          alert(`O horário das ${data.time} já foi preenchido por outro cliente.`);
          return;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
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
          user_id: user?.id 
        }]);

      if (error) throw error;
      
      // Atualiza a lista usando o ID da barbearia que acabamos de usar
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
      
      setAppointments(prev => 
        prev.map(app => app.id === id ? { ...app, status } : app)
      );
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
  };

  const deleteAppointment = async (id: string) => {
    // Removi o confirm daqui para não duplicar com o que você já tem na View
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

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