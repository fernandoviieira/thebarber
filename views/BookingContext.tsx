import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ==================== INTERFACES ====================

export interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  price: number;
  status: 'pendente' | 'confirmado' | 'finalizado' | 'cancelado';
  payment_method?: string;
  barbershop_id: string;
  user_id?: string;
  duration?: number;
  venda_id?: string;
  created_by_admin?: boolean;
  original_price?: number;
  tip_amount?: number;
  barber_id?: string
}

interface BookingContextType {
  appointments: Appointment[];
  addAppointment: (appointment: Omit<Appointment, 'id'>) => Promise<{ success: boolean; error?: string }>;
  updateStatus: (id: string, updates: any) => Promise<{ success: boolean; error?: string }>;
  deleteAppointment: (id: string) => Promise<{ success: boolean; error?: string }>;
  fetchAppointments: (barbershopId?: string) => Promise<void>;
  loading: boolean;
}

// ==================== FUNÇÕES AUXILIARES ====================
const formatAppointment = (app: any): Appointment => ({
  id: app.id,
  customerName: app.customer_name,
  customerPhone: app.customer_phone,
  service: app.service,
  barber: app.barber,
  date: app.date,
  time: app.time,
  price: Number(app.price) || 0,
  original_price: app.original_price ? Number(app.original_price) : Number(app.price) || 0,
  status: app.status,
  barbershop_id: app.barbershop_id,
  payment_method: app.payment_method,
  user_id: app.user_id,
  duration: app.duration,
  venda_id: app.venda_id,
  created_by_admin: app.created_by_admin,
  barber_id: app.barber_id,
  tip_amount: app.tip_amount || 0
});

const timeToMinutes = (t: string): number | null => {
  if (!t || typeof t !== 'string') return null;

  const parts = t.split(':');
  if (parts.length !== 2) return null;

  const [h, m] = parts.map(Number);

  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return null;
  }

  return h * 60 + m;
};

// ==================== CONTEXT ====================

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const currentBarbershopIdRef = useRef<string | undefined>(undefined);

  // ==================== FETCH APPOINTMENTS ====================

  const fetchAppointments = useCallback(async (barbershopId?: string) => {
    try {
      setLoading(true);
      let query = supabase.from('appointments').select('*');

      if (barbershopId) {
        query = query.eq('barbershop_id', barbershopId);
        currentBarbershopIdRef.current = barbershopId;
      }

      const { data, error } = await query
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;

      if (!mountedRef.current) return;

      setAppointments(data?.map(formatAppointment) || []);
    } catch (err) {
      console.error("❌ Erro ao carregar agendamentos:", err);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // ==================== REALTIME SUBSCRIPTION ====================

  useEffect(() => {
    mountedRef.current = true;

    const setupRealtime = async () => {
      try {
        // ✅ Buscar barbershopId do usuário autenticado
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('barbershop_id')
          .eq('id', user.id)
          .maybeSingle();

        const barbershopId = profile?.barbershop_id;

        // Carregar appointments iniciais
        await fetchAppointments(barbershopId);

        // ✅ Limpar canal anterior se existir
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        // ✅ Configurar filtro de realtime
        const channelConfig: any = {
          event: '*',
          schema: 'public',
          table: 'appointments'
        };

        if (barbershopId) {
          channelConfig.filter = `barbershop_id=eq.${barbershopId}`;
        }

        // ✅ Criar canal de realtime
        const channel: RealtimeChannel = supabase
          .channel('appointments-changes')
          .on('postgres_changes', channelConfig, (payload) => {
            if (!mountedRef.current) return;

            try {
              if (payload.eventType === 'INSERT') {
                const newApp = formatAppointment(payload.new);

                // Verificar barbershopId
                if (barbershopId && newApp.barbershop_id !== barbershopId) {
                  return;
                }

                setAppointments(prev => {
                  const exists = prev.some(app => app.id === newApp.id);
                  if (exists) return prev;

                  return [...prev, newApp].sort((a, b) => {
                    if (a.date !== b.date) return a.date.localeCompare(b.date);
                    return a.time.localeCompare(b.time);
                  });
                });
              }

              if (payload.eventType === 'UPDATE') {
                const updatedApp = formatAppointment(payload.new);
                setAppointments(prev =>
                  prev.map(app => app.id === updatedApp.id ? updatedApp : app)
                );
              }

              if (payload.eventType === 'DELETE') {
                setAppointments(prev => prev.filter(app => app.id !== payload.old.id));
              }
            } catch (err) {
              console.error('❌ Erro ao processar evento realtime:', err, payload);
            }
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Erro no canal realtime');
            }
          });

        channelRef.current = channel;

      } catch (err) {
        console.error('❌ Erro ao configurar realtime:', err);
      }
    };

    setupRealtime();

    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  // ==================== ADD APPOINTMENT ====================

  const addAppointment = async (data: Omit<Appointment, 'id'>): Promise<{ success: boolean; error?: string }> => {
    try {
      // ✅ Validações de horário
      if (data.status !== 'confirmado' && !data.created_by_admin) {
        const { data: barberData } = await supabase
          .from('barbers')
          .select('work_days')
          .eq('name', data.barber)
          .eq('barbershop_id', data.barbershop_id)
          .single();

        if (barberData?.work_days) {
          const [year, month, day] = data.date.split('-').map(Number);
          const dateObj = new Date(year, month - 1, day);
          const dayOfWeek = dateObj.getDay().toString();
          const dayConfig = barberData.work_days[dayOfWeek];

          if (!dayConfig || !dayConfig.active) {
            return {
              success: false,
              error: `O barbeiro ${data.barber} não atende neste dia.`
            };
          }

          const currentMin = timeToMinutes(data.time);
          const startMin = timeToMinutes(dayConfig.start);
          const endMin = timeToMinutes(dayConfig.end);

          if (currentMin === null || startMin === null || endMin === null) {
            return {
              success: false,
              error: 'Horário inválido.'
            };
          }

          if (currentMin < startMin || currentMin >= endMin) {
            return {
              success: false,
              error: `Fora da jornada: ${data.barber} atende das ${dayConfig.start} às ${dayConfig.end}.`
            };
          }
        }
      }

      // ✅ Pegar user_id do usuário autenticado
      const { data: userData } = await supabase.auth.getUser();
      // ✅ Inserir no banco
      const { error: insertError } = await supabase
        .from('appointments')
        .insert([{
          customer_name: data.customerName,
          customer_phone: data.customerPhone || 'Balcão',
          service: data.service,
          barber: data.barber,
          date: data.date,
          time: data.time,
          barber_id: data.barber_id,
          price: data.price,
          original_price: data.original_price || data.price,
          status: data.status,
          barbershop_id: data.barbershop_id,
          user_id: userData.user?.id,
          duration: data.duration,
          created_by_admin: data.created_by_admin ?? false,
          tip_amount: data.tip_amount || 0,
          payment_method: data.payment_method,
          venda_id: data.venda_id
        }]);

      if (insertError) {
        if (insertError.code === '23505') {
          return {
            success: false,
            error: `Ops! O horário das ${data.time} com ${data.barber} acabou de ser preenchido. Por favor, escolha outro horário.`
          };
        }
        throw insertError;
      }

      return { success: true };

    } catch (err: any) {
      console.error("❌ Erro ao adicionar agendamento:", err);
      return {
        success: false,
        error: err.message || 'Erro ao criar agendamento.'
      };
    }
  };

  // ==================== UPDATE STATUS ====================

  const updateStatus = async (id: string, updates: any): Promise<{ success: boolean; error?: string }> => {
    try {
      const payload = typeof updates === 'string' ? { status: updates } : updates;

      const { error } = await supabase
        .from('appointments')
        .update(payload)
        .eq('id', id);

      if (error) throw error;

      // Update otimista local
      setAppointments(prev => prev.map(app =>
        app.id === id ? { ...app, ...payload } : app
      ));

      return { success: true };

    } catch (err: any) {
      console.error("❌ Erro ao atualizar agendamento:", err);
      return {
        success: false,
        error: err.message || 'Erro ao atualizar agendamento.'
      };
    }
  };

  // ==================== DELETE APPOINTMENT ====================

  const deleteAppointment = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remoção otimista local
      setAppointments(prev => prev.filter(app => app.id !== id));

      return { success: true };

    } catch (err: any) {
      console.error("❌ Erro ao deletar agendamento:", err);
      return {
        success: false,
        error: err.message || 'Erro ao deletar agendamento.'
      };
    }
  };

  // ==================== PROVIDER ====================

  return (
    <BookingContext.Provider
      value={{
        appointments,
        addAppointment,
        updateStatus,
        deleteAppointment,
        fetchAppointments,
        loading
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

// ==================== HOOK ====================

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking deve ser usado dentro de um BookingProvider');
  }
  return context;
};
