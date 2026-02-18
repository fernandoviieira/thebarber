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
  checkSlotAvailability: (barberId: string, date: string, time: string) => Promise<boolean>;
  reservingSlots: Set<string>;
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

// ==================== CONTEXT ====================

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [reservingSlots, setReservingSlots] = useState<Set<string>>(new Set());

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

  // ==================== CHECK SLOT AVAILABILITY ====================

  const checkSlotAvailability = useCallback(async (
    barberId: string,
    date: string,
    time: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('id')
        .eq('barber_id', barberId)
        .eq('date', date)
        .eq('time', time)
        .in('status', ['pendente', 'confirmado'])
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Erro ao verificar disponibilidade:', error);
        return false;
      }

      return !data; // true se disponível (sem dados), false se ocupado
    } catch (err) {
      console.error('❌ Erro ao verificar slot:', err);
      return false;
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

                // 🔒 Marcar slot como "reservando" temporariamente
                const slotKey = `${newApp.barber_id}-${newApp.date}-${newApp.time}`;
                setReservingSlots(prev => new Set(prev).add(slotKey));
                
                // Remover marcação após 2 segundos
                setTimeout(() => {
                  setReservingSlots(prev => {
                    const next = new Set(prev);
                    next.delete(slotKey);
                    return next;
                  });
                }, 2000);

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
  }, [fetchAppointments]);

  // ==================== ADD APPOINTMENT ====================

  const addAppointment = async (data: Omit<Appointment, 'id'>): Promise<{ success: boolean; error?: string }> => {
    try {
      // ✅ Pegar user_id do usuário autenticado
      const { data: userData } = await supabase.auth.getUser();

     const rpcParams = {
        p_customer_name: data.customerName,
        p_customer_phone: data.customerPhone || 'Balcão',
        p_service: data.service,
        p_barber: data.barber,
        p_barber_id: data.barber_id,
        p_date: data.date,
        p_time: data.time,
        p_price: data.price,
        p_original_price: data.original_price || data.price,
        p_status: data.status,
        p_barbershop_id: data.barbershop_id,
        p_user_id: userData.user?.id || null,
        p_duration: data.duration || null,
        p_created_by_admin: data.created_by_admin ?? false,
        p_tip_amount: data.tip_amount || 0,
        p_payment_method: data.payment_method || null,
        p_venda_id: data.venda_id || null
      };

      console.log("🚀 Enviando para RPC 'create_appointment_safe':", rpcParams);

      const { data: result, error } = await supabase.rpc('create_appointment_safe', rpcParams);

      if (error) {
        console.error('❌ Erro ao chamar função RPC:', error);
        throw error;
      }

      // ✅ Processar resposta da função
      if (!result || !result.success) {
        return {
          success: false,
          error: result?.error || 'Erro desconhecido ao criar agendamento.'
        };
      }

      return { success: true };

    } catch (err: any) {
      console.error("❌ Erro ao adicionar agendamento:", err);
      
      // Tratamento específico de erros
      if (err.code === '23505' || err.message?.includes('unique')) {
        return {
          success: false,
          error: 'Ops! Este horário acabou de ser reservado. Por favor, escolha outro horário.'
        };
      }

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
        checkSlotAvailability,
        reservingSlots,
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
