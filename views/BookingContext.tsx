import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

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

// ✅ NOVO: Interface para assinatura ativa
export interface ActiveSubscription {
  id: string;
  customer_id: string;
  plan_id: string;
  plan_name: string;
  limit_services: number;
  used_services: number;
  remaining_services: number;
  current_period_end: string;
  status: string;
}

interface BookingContextType {
  appointments: Appointment[];
  addAppointment: (appointment: Omit<Appointment, 'id'>) => Promise<{ success: boolean; error?: string }>;
  updateStatus: (id: string, updates: any) => Promise<{ success: boolean; error?: string }>;
  deleteAppointment: (id: string) => Promise<{ success: boolean; error?: string }>;
  fetchAppointments: (barbershopId?: string) => Promise<void>;
  checkSlotAvailability: (barberId: string, date: string, time: string) => Promise<boolean>;
  sendCancellationNotification: (appointment: Appointment, barbershopPhone: string) => Promise<{ success: boolean; error?: string }>;
  reservingSlots: Set<string>;
  loading: boolean;
  // ✅ NOVAS FUNÇÕES PARA ASSINANTES
  checkCustomerSubscription: (customerPhone: string) => Promise<ActiveSubscription | null>;
  recordSubscriptionUsage: (subscriptionId: string, appointmentId: string) => Promise<{ success: boolean; error?: string }>;
  getSubscribersMap: () => Promise<Map<string, ActiveSubscription>>;
  activeSubscriptions: Map<string, ActiveSubscription>;
}

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

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [reservingSlots, setReservingSlots] = useState<Set<string>>(new Set());
  // ✅ NOVO: Estado para armazenar mapa de assinantes ativos (phone -> subscription)
  const [activeSubscriptions, setActiveSubscriptions] = useState<Map<string, ActiveSubscription>>(new Map());
  
  const mountedRef = useRef(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const currentBarbershopIdRef = useRef<string | undefined>(undefined);

  // ✅ NOVO: Buscar todos os assinantes ativos da barbearia
  const fetchActiveSubscriptions = useCallback(async (barbershopId: string) => {
    try {
      const { data, error } = await supabase
        .from('club_subscriptions')
        .select(`
          id,
          customer_id,
          plan_id,
          status,
          current_period_end,
          profiles:customer_id (
            phone
          ),
          plan:plan_id (
            name,
            limit_services
          ),
          usage:club_usage_history (
            id
          )
        `)
        .eq('barbershop_id', barbershopId)
        .eq('status', 'active');

      if (error) throw error;

      const subscriptionMap = new Map<string, ActiveSubscription>();
      
      data?.forEach(sub => {
        const customerPhone = sub.profiles?.phone;
        if (!customerPhone) return;

        const usedCount = sub.usage?.length || 0;
        const limit = sub.plan?.limit_services || 0;
        
        subscriptionMap.set(customerPhone.replace(/\D/g, ''), {
          id: sub.id,
          customer_id: sub.customer_id,
          plan_id: sub.plan_id,
          plan_name: sub.plan?.name || 'Plano',
          limit_services: limit,
          used_services: usedCount,
          remaining_services: Math.max(0, limit - usedCount),
          current_period_end: sub.current_period_end,
          status: sub.status
        });
      });

      setActiveSubscriptions(subscriptionMap);
      return subscriptionMap;
    } catch (err) {
      console.error('❌ Erro ao buscar assinantes ativos:', err);
      return new Map();
    }
  }, []);

  // ✅ NOVO: Verificar se um telefone pertence a um assinante ativo
  const checkCustomerSubscription = useCallback(async (customerPhone: string): Promise<ActiveSubscription | null> => {
    if (!customerPhone || !currentBarbershopIdRef.current) return null;

    const cleanPhone = customerPhone.replace(/\D/g, '');
    
    // Primeiro tenta no mapa em memória
    const cached = activeSubscriptions.get(cleanPhone);
    if (cached) return cached;

    // Se não estiver em memória, busca no banco
    try {
      const { data, error } = await supabase
        .from('club_subscriptions')
        .select(`
          id,
          customer_id,
          plan_id,
          status,
          current_period_end,
          profiles:customer_id!inner (
            phone
          ),
          plan:plan_id (
            name,
            limit_services
          ),
          usage:club_usage_history (
            id
          )
        `)
        .eq('profiles.phone', cleanPhone)
        .eq('status', 'active')
        .eq('barbershop_id', currentBarbershopIdRef.current)
        .maybeSingle();

      if (error || !data) return null;

      const usedCount = data.usage?.length || 0;
      const limit = data.plan?.limit_services || 0;

      const subscription: ActiveSubscription = {
        id: data.id,
        customer_id: data.customer_id,
        plan_id: data.plan_id,
        plan_name: data.plan?.name || 'Plano',
        limit_services: limit,
        used_services: usedCount,
        remaining_services: Math.max(0, limit - usedCount),
        current_period_end: data.current_period_end,
        status: data.status
      };

      // Atualiza o mapa
      setActiveSubscriptions(prev => new Map(prev).set(cleanPhone, subscription));

      return subscription;
    } catch (err) {
      console.error('❌ Erro ao verificar assinatura:', err);
      return null;
    }
  }, [activeSubscriptions]);

  // ✅ NOVO: Registrar uso de assinatura
  const recordSubscriptionUsage = useCallback(async (
    subscriptionId: string, 
    appointmentId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('club_usage_history')
        .insert([{
          subscription_id: subscriptionId,
          appointment_id: appointmentId,
          used_at: new Date().toISOString()
        }]);

      if (error) throw error;

      // Atualiza o mapa de assinantes (reduz remaining_services)
      setActiveSubscriptions(prev => {
        const updated = new Map(prev);
        for (let [phone, sub] of updated.entries()) {
          if (sub.id === subscriptionId) {
            updated.set(phone, {
              ...sub,
              used_services: sub.used_services + 1,
              remaining_services: Math.max(0, sub.remaining_services - 1)
            });
            break;
          }
        }
        return updated;
      });

      return { success: true };
    } catch (err: any) {
      console.error('❌ Erro ao registrar uso da assinatura:', err);
      return {
        success: false,
        error: err.message || 'Erro ao registrar uso da assinatura'
      };
    }
  }, []);

  // ✅ NOVO: Buscar mapa completo de assinantes
  const getSubscribersMap = useCallback(async (): Promise<Map<string, ActiveSubscription>> => {
    if (currentBarbershopIdRef.current) {
      await fetchActiveSubscriptions(currentBarbershopIdRef.current);
    }
    return activeSubscriptions;
  }, [activeSubscriptions, fetchActiveSubscriptions]);

  const fetchAppointments = useCallback(async (barbershopId?: string) => {
    try {
      setLoading(true);
      if (!barbershopId) {
        setAppointments([]);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) {
        console.error('❌ Erro do Supabase:', error);
        throw error;
      }

      if (!mountedRef.current) return;
      setAppointments(data?.map(formatAppointment) || []);
      currentBarbershopIdRef.current = barbershopId;

      // ✅ NOVO: Quando carregar agendamentos, também carrega assinantes ativos
      await fetchActiveSubscriptions(barbershopId);

    } catch (err: any) {
      console.error("❌ Erro ao carregar agendamentos:", {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code
      });
      setAppointments([]);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchActiveSubscriptions]);

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

      return !data;
    } catch (err) {
      console.error('❌ Erro ao verificar slot:', err);
      return false;
    }
  }, []);

  const sendCancellationNotification = useCallback(async (
    appointment: Appointment,
    barbershopPhone: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!barbershopPhone || barbershopPhone.trim() === '') {
        return {
          success: false,
          error: 'Telefone da barbearia não informado'
        };
      }

      const formattedDate = new Date(appointment.date + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      const message = `🔔 *AGENDAMENTO CANCELADO* 🔔\n\n` +
        `👤 *Cliente:* ${appointment.customerName}\n` +
        `📞 *Telefone:* ${appointment.customerPhone}\n` +
        `💈 *Serviço:* ${appointment.service}\n` +
        `✂️ *Barbeiro:* ${appointment.barber}\n` +
        `📅 *Data:* ${formattedDate}\n` +
        `⏰ *Horário:* ${appointment.time}\n\n` +
        `❌ _O cliente cancelou este agendamento._`;

      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          number: appointment.customerPhone,
          shopNumber: barbershopPhone,
          message: message
        }
      });

      if (error) {
        console.error('❌ Erro da Edge Function:', error);
        return {
          success: false,
          error: error.message || 'Erro ao enviar notificação'
        };
      }

      return { success: true };

    } catch (err: any) {
      console.error('❌ Erro ao enviar notificação de cancelamento:', err);
      return {
        success: false,
        error: err.message || 'Erro ao enviar notificação'
      };
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const setupRealtime = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('barbershop_id')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('❌ Erro ao buscar perfil:', profileError);
          return;
        }

        const barbershopId = profile?.barbershop_id;

        if (!barbershopId) {
          setAppointments([]);
          setLoading(false);
          return;
        }

        await fetchAppointments(barbershopId);

        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        const channelConfig: any = {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `barbershop_id=eq.${barbershopId}`
        };

        const channel: RealtimeChannel = supabase
          .channel('appointments-changes')
          .on('postgres_changes', channelConfig, (payload) => {
            if (!mountedRef.current) return;
            try {
              if (payload.eventType === 'INSERT') {
                const newApp = formatAppointment(payload.new);

                if (newApp.barbershop_id !== barbershopId) {
                  return;
                }

                const slotKey = `${newApp.barber_id}-${newApp.date}-${newApp.time}`;
                setReservingSlots(prev => new Set(prev).add(slotKey));

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

                  const newList = [...prev, newApp].sort((a, b) => {
                    if (a.date !== b.date) return a.date.localeCompare(b.date);
                    return a.time.localeCompare(b.time);
                  });

                  return newList;
                });
              }

              if (payload.eventType === 'UPDATE') {
                const updatedApp = formatAppointment(payload.new);

                if (updatedApp.barbershop_id !== barbershopId) {
                  return;
                }

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
            } else if (status === 'TIMED_OUT') {
              console.error('⏰ Timeout no canal realtime');
            }
          });

        channelRef.current = channel;

        // ✅ NOVO: Canal para atualizações de assinaturas
        const subsChannel = supabase
          .channel('subscriptions-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'club_subscriptions',
              filter: `barbershop_id=eq.${barbershopId}`
            },
            () => {
              // Recarrega assinantes quando houver mudanças
              fetchActiveSubscriptions(barbershopId);
            }
          )
          .subscribe();

        // ✅ NOVO: Canal para histórico de uso
        const usageChannel = supabase
          .channel('usage-changes')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'club_usage_history'
            },
            (payload) => {
              // Quando um novo uso é registrado, atualiza o mapa
              fetchActiveSubscriptions(barbershopId);
            }
          )
          .subscribe();

      } catch (err) {
        console.error('❌ Erro ao configurar realtime:', err);
        setLoading(false);
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
  }, [fetchAppointments, fetchActiveSubscriptions]);

  const addAppointment = async (data: Omit<Appointment, 'id'>): Promise<{ success: boolean; error?: string }> => {
    try {
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

      const { data: result, error } = await supabase.rpc('create_appointment_safe', rpcParams);

      if (error) {
        console.error('❌ Erro ao chamar função RPC:', error);
        throw error;
      }

      if (!result || !result.success) {
        return {
          success: false,
          error: result?.error || 'Erro desconhecido ao criar agendamento.'
        };
      }

      if (result.appointment_id) {
        const { data: newAppointment } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', result.appointment_id)
          .single();

        if (newAppointment) {
          const formatted = formatAppointment(newAppointment);
          setAppointments(prev => {
            const exists = prev.some(a => a.id === formatted.id);
            if (exists) return prev;
            return [...prev, formatted].sort((a, b) => {
              if (a.date !== b.date) return a.date.localeCompare(b.date);
              return a.time.localeCompare(b.time);
            });
          });
        }
      }

      return { success: true };

    } catch (err: any) {
      console.error("❌ Erro ao adicionar agendamento:", err);

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

  const updateStatus = async (id: string, updates: any): Promise<{ success: boolean; error?: string }> => {
    try {
      const payload = typeof updates === 'string' ? { status: updates } : updates;

      const { error } = await supabase
        .from('appointments')
        .update(payload)
        .eq('id', id);

      if (error) throw error;

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

  const deleteAppointment = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;

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

  return (
    <BookingContext.Provider
      value={{
        appointments,
        addAppointment,
        updateStatus,
        deleteAppointment,
        fetchAppointments,
        checkSlotAvailability,
        sendCancellationNotification,
        reservingSlots,
        loading,
        // ✅ NOVAS FUNÇÕES EXPORTADAS
        checkCustomerSubscription,
        recordSubscriptionUsage,
        getSubscribersMap,
        activeSubscriptions
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking deve ser usado dentro de um BookingProvider');
  }
  return context;
};