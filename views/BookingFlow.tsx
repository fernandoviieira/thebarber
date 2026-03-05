import React, { useState, useEffect, useMemo } from 'react';
import { Service, Barber } from '../types';
import {
  Check, ArrowLeft, Calendar as CalendarIcon, Clock,
  CheckCircle2, User, Phone, Scissors, Loader2, AlertTriangle, Crown
} from 'lucide-react';
import { useBooking } from './BookingContext';
import { supabase } from '@/lib/supabase';

interface BookingFlowProps {
  onComplete: () => void;
  onCancel: () => void;
}

type ServiceCategory =
  | 'Todos'
  | 'Corte'
  | 'Barba'
  | 'Sobrancelha'
  | 'Combo'
  | 'Químicos'
  | 'Infantil'
  | 'Outros';

/* =========================
   ✅ PREMIUM UI COMPONENTS
   ========================= */

const ServiceCardSkeleton: React.FC = () => (
  <div className="w-full flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-4 md:px-5 md:py-5 animate-pulse">
    <div className="min-w-0 flex-1">
      <div className="h-4 w-48 bg-zinc-800 rounded mb-2" />
      <div className="h-3 w-24 bg-zinc-800 rounded" />
    </div>

    <div className="flex items-center gap-3 flex-shrink-0">
      <div className="h-4 w-20 bg-zinc-800 rounded" />
      <div className="h-5 w-5 bg-zinc-800 rounded-full" />
    </div>
  </div>
);

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
};

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon
}) => (
  <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 text-center space-y-3">
    <div className="flex justify-center">
      <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
        {icon}
      </div>
    </div>

    <div className="space-y-1">
      <p className="text-white font-black italic uppercase text-sm tracking-tight">
        {title}
      </p>
      {description && (
        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest italic">
          {description}
        </p>
      )}
    </div>

    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="w-full bg-zinc-900 border border-zinc-800 text-white font-black py-3 rounded-xl uppercase italic text-xs hover:border-amber-500/40"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

const BookingFlow: React.FC<BookingFlowProps> = ({ onComplete, onCancel }) => {
  const {
    addAppointment,
    appointments,
    fetchAppointments,
    checkSlotAvailability,
    reservingSlots,
    // ✅ NOVAS FUNÇÕES DO CONTEXT
    checkCustomerSubscription,
    recordSubscriptionUsage,
    activeSubscriptions
  } = useBooking();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);

  const [currentBarbershopId, setCurrentBarbershopId] = useState<string | null>(null);
  const [availableBarbers, setAvailableBarbers] = useState<Barber[]>([]);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);

  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  const [shopSettings, setShopSettings] = useState<{
    is_closed: boolean;
    opening_time: string;
    closing_time: string;
  } | null>(null);

  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [barbershopPhone, setBarbershopPhone] = useState('');

  // ✅ NOVO: Estado para identificar se é assinante
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [subscriberInfo, setSubscriberInfo] = useState<{
    planName: string;
    remainingServices: number;
    willUseSubscription: boolean;
  } | null>(null);

  // ✅ NOVO: Estado para loading da verificação de assinante
  const [checkingSubscriber, setCheckingSubscriber] = useState(false);

  // ✅ PREMIUM: estados de UI do Step 1 (serviços)
  const [serviceQuery, setServiceQuery] = useState('');
  const [showAllServices, setShowAllServices] = useState(false);
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>('Todos');

  const normalizeText = (text: string) =>
    (text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const getServiceCategory = (serviceName: string): ServiceCategory => {
    const n = normalizeText(serviceName);

    // Heurística simples e eficaz (sem precisar de campo "category" no banco)
    if (/(combo|completo|corte\s*\+\s*barba|barba\s*\+\s*corte)/.test(n)) return 'Combo';
    if (/(sobrancelha|design|eyebrow)/.test(n)) return 'Sobrancelha';
    if (/(barba|bigode|pezinho\s*da\s*barba)/.test(n)) return 'Barba';
    if (/(infantil|crianca|criança|kids)/.test(n)) return 'Infantil';
    if (/(luzes|reflexo|progressiva|quimica|química|alisamento|tintura|coloracao|coloração|platinado)/.test(n)) return 'Químicos';
    if (/(corte|degrade|degradê|máquina|maquina|tesoura|navalha|acabamento|pezinho)/.test(n)) return 'Corte';

    return 'Outros';
  };

  const categoryOrder: ServiceCategory[] = [
    'Todos',
    'Corte',
    'Barba',
    'Combo',
    'Sobrancelha',
    'Químicos',
    'Infantil',
    'Outros'
  ];

  const scoreService = (s: Service) => {
    // Heurística de “popularidade”: combos e corte/barba sobem
    const name = normalizeText(s.name);
    let score = 0;

    if (name.includes('combo') || name.includes('completo')) score += 30;
    if (name.includes('corte')) score += 20;
    if (name.includes('barba')) score += 15;
    if (name.includes('sobrancelha')) score += 8;
    if (name.includes('pezinho') || name.includes('acabamento')) score += 6;

    // Leve preferência por serviços com preço preenchido (evita aparecer “R$ 0” como top)
    const price = Number(s.price) || 0;
    score += Math.min(price / 10, 10);

    return score;
  };

  const getBrasiliaDateTime = () => {
    const now = new Date();

    const dateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);

    const timeStr = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now);

    return { dateStr, timeStr };
  };

  useEffect(() => {
    async function loadBookingData() {
      setLoading(true);
      try {
        const slug = window.location.pathname.split('/')[1];
        const { data: barbershop } = await supabase
          .from('barbershops')
          .select('id, phone')
          .eq('slug', slug)
          .single();

        if (barbershop) {
          setCurrentBarbershopId(barbershop.id);
          setBarbershopPhone(barbershop.phone);
          const [barbersRes, servicesRes, settingsRes] = await Promise.all([
            supabase.from('barbers').select('*').eq('barbershop_id', barbershop.id).order('name'),
            supabase.from('services').select('*').eq('barbershop_id', barbershop.id).order('name'),
            supabase.from('barbershop_settings').select('*').eq('barbershop_id', barbershop.id).maybeSingle()
          ]);

          if (barbersRes.data) setAvailableBarbers(barbersRes.data);
          if (servicesRes.data) setAvailableServices(servicesRes.data);
          if (settingsRes.data) setShopSettings(settingsRes.data);
        }
      } catch (err) {
        console.error("❌ Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBookingData();
  }, []);

  // ✅ NOVO: Efeito para verificar se é assinante quando o telefone é preenchido
  useEffect(() => {
    async function verifySubscriber() {
      if (customerPhone.length >= 14 && currentBarbershopId) {
        setCheckingSubscriber(true);
        try {
          const subscription = await checkCustomerSubscription(customerPhone);

          if (subscription) {
            setIsSubscriber(true);
            setSubscriberInfo({
              planName: subscription.plan_name,
              remainingServices: subscription.remaining_services,
              willUseSubscription: false
            });
          } else {
            setIsSubscriber(false);
            setSubscriberInfo(null);
          }
        } catch (error) {
          console.error('❌ Erro ao verificar assinante:', error);
          setIsSubscriber(false);
          setSubscriberInfo(null);
        } finally {
          setCheckingSubscriber(false);
        }
      } else {
        setIsSubscriber(false);
        setSubscriberInfo(null);
      }
    }

    const timeout = setTimeout(verifySubscriber, 500);
    return () => clearTimeout(timeout);
  }, [customerPhone, currentBarbershopId, checkCustomerSubscription]);

  const totalDuration = selectedServices.reduce((acc, s) => {
    const d = typeof s.duration === 'string'
      ? parseInt(s.duration.replace(/\D/g, ''))
      : s.duration;
    return acc + (Number(d) || 0);
  }, 0);

  const totalPrice = selectedServices.reduce((acc, s) => acc + Number(s.price), 0);

  const timeToMinutes = (t: string) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const isRangeOccupied = (date: string, startTime: string, barberName: string, duration: number) => {
    const startMin = timeToMinutes(startTime);
    const endMin = startMin + duration;

    return appointments.some(app => {
      if (app.date !== date || app.barber !== barberName || app.status === 'cancelado') return false;

      const appStart = timeToMinutes(app.time);
      const appDuration = typeof app.duration === 'string' ? parseInt(app.duration) : (app.duration || 30);
      const appEnd = appStart + appDuration;

      const hasCollision = (startMin < appEnd && endMin > appStart);
      return hasCollision;
    });
  };

  const isSlotReserving = (barberId: string, date: string, time: string) => {
    const slotKey = `${barberId}-${date}-${time}`;
    return reservingSlots.has(slotKey);
  };

  const handleFinalizeBooking = async () => {
    if (!selectedBarber || !currentBarbershopId) {
      console.warn("⚠️ [Booking] Tentativa de finalizar sem barbeiro ou ID da barbearia.");
      return;
    }

    const isAvailable = await checkSlotAvailability(
      selectedBarber.id,
      selectedDate,
      selectedTime
    );

    if (!isAvailable) {
      alert('⚠️ Ops! Este horário acabou de ser reservado por outro cliente. Por favor, escolha outro horário.');
      await fetchAppointments(currentBarbershopId);
      setSelectedTime('');
      setStep(3);
      return;
    }

    if (isSubscriber && subscriberInfo?.willUseSubscription) {
      const freshSubscription = await checkCustomerSubscription(customerPhone);

      if (!freshSubscription || freshSubscription.remaining_services <= 0) {
        alert('⚠️ Seu plano não possui mais créditos disponíveis neste mês. O agendamento será feito no valor normal.');
        setSubscriberInfo(prev => prev ? { ...prev, willUseSubscription: false } : null);
      }
    }

    const finalPrice = isSubscriber && subscriberInfo?.willUseSubscription ? 0 : totalPrice;

    const newBooking = {
      customerName,
      customerPhone,
      service: selectedServices.map(s => s.name).join(', '),
      barber: selectedBarber.name,
      date: selectedDate,
      time: selectedTime,
      barber_id: selectedBarber.id,
      price: finalPrice,
      original_price: totalPrice,
      status: 'pendente' as const,
      barbershop_id: currentBarbershopId,
      duration: totalDuration,
      created_by_admin: false,
      payment_method: isSubscriber && subscriberInfo?.willUseSubscription ? 'plano' : undefined
    };

    const result = await addAppointment(newBooking as any);

    if (result.success) {
      if (isSubscriber && subscriberInfo?.willUseSubscription && result.appointment_id) {
        const subscription = await checkCustomerSubscription(customerPhone);
        if (subscription) {
          await recordSubscriptionUsage(subscription.id, result.appointment_id);
        }
      }

      setSendingWhatsApp(true);

      try {
        await fetchAppointments(currentBarbershopId);

        const planMessage = isSubscriber && subscriberInfo?.willUseSubscription
          ? `🎟️ *Plano utilizado:* ${subscriberInfo.planName}\n💳 *Valor:* R$ 0,00 (Crédito do plano)\n`
          : `💰 *Valor:* R$ ${totalPrice.toFixed(2)}`;

        const payload = {
          number: customerPhone,
          shopNumber: barbershopPhone,
          message: `🔥 *AGENDAMENTO CONFIRMADO* 🔥\n\nOlá, ${customerName}!\n\n✂️ Serviço: ${newBooking.service}\n👨‍💼 Profissional: ${newBooking.barber}\n📅 Data: ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}\n🕐 Horário: ${selectedTime}\n${planMessage}`
        };

        const { data, error: funcError } = await supabase.functions.invoke('send-whatsapp', {
          body: payload
        });

        if (funcError) {
          console.error("❌ Erro detalhado da Function:", funcError);
        }

      } catch (err) {
        console.error('💥 Falha crítica ao chamar Edge Function:', err);
      } finally {
        setSendingWhatsApp(false);
        setStep(5);
      }
    } else {
      console.error("❌ Erro ao salvar agendamento:", result.error);
      alert(result.error || 'Erro ao criar agendamento. Tente novamente.');
      await fetchAppointments(currentBarbershopId);
      setSelectedTime('');
      setStep(3);
    }
  };

  const formatPhone = (value: string) => {
    if (!value) return "";
    value = value.replace(/\D/g, "");
    value = value.replace(/(\d{2})(\d)/, "($1) $2");
    value = value.replace(/(\d{5})(\d)/, "$1-$2");
    return value.substring(0, 15);
  };

  // ✅ PREMIUM: derivados do Step 1
  const servicesCount = availableServices.length;
  const hasTooManyServices = servicesCount > 12;
  const FEATURED_LIMIT = 8;

  const availableCategories: ServiceCategory[] = useMemo(() => {
    const set = new Set<ServiceCategory>();
    availableServices.forEach(s => set.add(getServiceCategory(s.name)));
    const present = categoryOrder.filter(c => c === 'Todos' || set.has(c));
    return present.length ? present : ['Todos'];
  }, [availableServices]);

  const filteredServices = useMemo(() => {
    const q = normalizeText(serviceQuery);

    return availableServices
      .filter(s => {
        if (serviceCategory === 'Todos') return true;
        return getServiceCategory(s.name) === serviceCategory;
      })
      .filter(s => {
        if (!q) return true;
        return normalizeText(s.name).includes(q);
      });
  }, [availableServices, serviceQuery, serviceCategory]);

  const featuredServices = useMemo(() => {
    const q = normalizeText(serviceQuery);
    if (q) return filteredServices;

    const sorted = [...filteredServices].sort((a, b) => scoreService(b) - scoreService(a));
    return sorted.slice(0, FEATURED_LIMIT);
  }, [filteredServices, serviceQuery]);

  const servicesToRender = useMemo(() => {
    const q = normalizeText(serviceQuery);
    if (q) return filteredServices; // buscando => mostra tudo do filtro
    if (showAllServices) return filteredServices;
    return featuredServices;
  }, [filteredServices, featuredServices, showAllServices, serviceQuery]);

  useEffect(() => {
    setShowAllServices(false);
  }, [serviceCategory]);

  // ✅ IMPORTANTE: mantém skeleton no Step 1 (em vez de travar na tela de loading)
  if (loading && step !== 1) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-amber-500 mb-4" size={40} />
        <p className="text-zinc-500 font-black uppercase italic text-xs tracking-widest">
          Carregando Agenda...
        </p>
      </div>
    );
  }

  const renderStep1 = () => {
    const hasActiveFilters =
      normalizeText(serviceQuery).length > 0 || (serviceCategory && serviceCategory !== 'Todos');

    return (
      <div className="space-y-5 animate-in slide-in-from-right duration-300">
        <div className="space-y-2">
          <h3 className="text-xl md:text-2xl font-black text-amber-500 text-center uppercase italic tracking-tighter">
            O que vamos fazer?
          </h3>

          {/* Busca */}
          {hasTooManyServices && (
            <div className="space-y-2">
              <input
                value={serviceQuery}
                onChange={(e) => {
                  setServiceQuery(e.target.value);
                  setShowAllServices(false);
                }}
                placeholder={`Buscar serviço... (${servicesCount})`}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 md:p-5 text-white font-black italic outline-none focus:border-amber-500 text-sm"
              />

              {/* Serviço selecionado em destaque */}
              {selectedServices[0] && (
                <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/40 rounded-2xl px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest italic">
                      Selecionado
                    </p>
                    <p className="font-black text-white italic uppercase text-sm truncate">
                      {selectedServices[0].name}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedServices([])}
                    className="text-[10px] font-black uppercase tracking-widest text-amber-500 hover:text-amber-400"
                  >
                    Limpar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Categorias (abas) */}
          {hasTooManyServices && availableCategories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
              {availableCategories.map(cat => {
                const active = serviceCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setServiceCategory(cat)}
                    className={[
                      "flex-shrink-0 px-4 py-2 rounded-2xl border text-[10px] font-black uppercase italic tracking-widest transition-all",
                      active
                        ? "bg-amber-500 text-black border-amber-500"
                        : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-amber-500/40"
                    ].join(" ")}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          )}

          {/* Label de “Recomendados” quando não está vendo tudo */}
          {hasTooManyServices && !showAllServices && !normalizeText(serviceQuery) && (
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest italic text-center">
              Recomendados para você
            </p>
          )}
        </div>

        {/* ✅ Lista (com skeleton + EmptyState) */}
        <div
          className={[
            "grid grid-cols-1 gap-2",
            hasTooManyServices ? "max-h-[52vh] overflow-y-auto pr-1" : ""
          ].join(" ")}
        >
          {loading ? (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <ServiceCardSkeleton key={i} />
              ))}
            </>
          ) : (
            <>
              {servicesToRender.map(service => {
                const isSelected = selectedServices[0]?.id === service.id;

                return (
                  <button
                    key={service.id}
                    onClick={() => setSelectedServices(isSelected ? [] : [service])}
                    aria-pressed={isSelected}
                    className={[
                      "w-full flex items-center justify-between rounded-2xl border transition-all",
                      "px-4 py-4 md:px-5 md:py-5",
                      isSelected
                        ? "bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/10"
                        : "bg-zinc-900 border-zinc-800 hover:border-amber-500/40"
                    ].join(" ")}
                  >
                    <div className="text-left min-w-0">
                      <p className="font-black text-white italic uppercase text-sm md:text-base truncate">
                        {service.name}
                      </p>
                      <p className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest italic">
                        {service.duration}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-black text-amber-500 italic text-sm md:text-base">
                        R$ {Number(service.price).toFixed(2)}
                      </span>
                      {isSelected && <Check size={18} className="text-amber-500" />}
                    </div>
                  </button>
                );
              })}

              {/* ✅ EmptyState Premium quando não encontrar */}
              {servicesToRender.length === 0 && (
                <EmptyState
                  icon={<AlertTriangle size={18} className="text-amber-500" />}
                  title="Nenhum serviço encontrado"
                  description={
                    hasActiveFilters
                      ? "Tente outro termo ou limpe os filtros"
                      : "Cadastre serviços para aparecer aqui"
                  }
                  actionLabel={hasActiveFilters ? "Limpar filtros" : undefined}
                  onAction={
                    hasActiveFilters
                      ? () => {
                          setServiceQuery('');
                          setServiceCategory('Todos');
                          setShowAllServices(false);
                        }
                      : undefined
                  }
                />
              )}
            </>
          )}
        </div>

        {/* Toggle “ver todos” (só quando não está buscando) */}
        {hasTooManyServices && !normalizeText(serviceQuery) && !loading && (
          <button
            onClick={() => setShowAllServices(v => !v)}
            className="w-full bg-zinc-900 border border-zinc-800 text-white font-black py-4 rounded-2xl uppercase italic text-xs hover:border-amber-500/40"
          >
            {showAllServices ? "Ver menos" : `Ver todos (${filteredServices.length})`}
          </button>
        )}

        <button
          disabled={loading || selectedServices.length === 0}
          onClick={() => setStep(2)}
          className="w-full bg-amber-500 text-black font-black py-4 md:py-5 rounded-2xl uppercase italic text-sm shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continuar
        </button>
      </div>
    );
  };

  /* ==========================================================
     A PARTIR DAQUI, SEU CÓDIGO CONTINUA IGUAL (steps 2..5)
     ========================================================== */

  const renderStep2 = () => (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <h3 className="text-xl md:text-2xl font-black text-amber-500 text-center uppercase italic tracking-tighter">
        Qual profissional?
      </h3>
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {availableBarbers.map(barber => (
          <button
            key={barber.id}
            onClick={() => setSelectedBarber(barber)}
            className={`flex flex-col items-center p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border transition-all ${selectedBarber?.id === barber.id
              ? 'bg-amber-500/10 border-amber-500 shadow-lg'
              : 'bg-zinc-900 border-zinc-800'
              }`}
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full mb-3 bg-zinc-950 flex items-center justify-center border border-zinc-800 shadow-inner">
              <Scissors size={48} className="text-amber-500 -rotate-45" />
            </div>

            <span className="font-black text-white italic uppercase text-[10px] md:text-xs text-center">
              {barber.name}
            </span>
          </button>
        ))}
      </div>
      <div className="flex gap-4">
        <button
          onClick={() => setStep(1)}
          className="flex-1 bg-zinc-800 font-black py-4 rounded-2xl text-white uppercase italic text-xs"
        >
          Voltar
        </button>
        <button
          disabled={!selectedBarber}
          onClick={() => setStep(3)}
          className="flex-1 bg-amber-500 text-black font-black py-4 rounded-2xl uppercase italic text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Próximo
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => {
    const { dateStr: todayStr, timeStr: brasiliaTime } = getBrasiliaDateTime();
    const [nowH, nowM] = brasiliaTime.split(':').map(Number);
    const currentTotalMinutes = nowH * 60 + nowM;

    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
        <h3 className="text-xl md:text-2xl font-black text-amber-500 text-center uppercase italic tracking-tighter">Escolha o Horário</h3>

        {/* Grid de Datas */}
        <div className="flex gap-2 md:gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
          {Array.from({ length: 30 }, (_, i) => {
            const [year, month, day] = todayStr.split('-').map(Number);
            const d = new Date(year, month - 1, day);
            d.setDate(d.getDate() + i);
            const dateStr = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });
            const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const isWorkingDay = selectedBarber?.work_days?.[d.getDay().toString()]?.active;

            return (
              <button
                key={i}
                disabled={!isWorkingDay}
                onClick={() => { setSelectedDate(value); setSelectedTime(''); }}
                className={`flex-shrink-0 w-16 md:w-20 py-4 md:py-5 rounded-2xl border transition-all flex flex-col items-center justify-center ${selectedDate === value
                  ? 'bg-amber-500 text-black border-amber-500 shadow-lg'
                  : isWorkingDay
                    ? 'bg-zinc-900 border-zinc-800'
                    : 'opacity-10 grayscale cursor-not-allowed'
                  }`}
              >
                <p className="text-[8px] md:text-[9px] uppercase font-black italic">{dateStr.split(' ')[0]}</p>
                <p className="text-lg md:text-xl font-black italic">{dateStr.split(' ')[1]}</p>
              </button>
            );
          })}
        </div>

        {selectedDate && (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {Array.from({ length: 24 * 4 }, (_, i) => {
              const hour = Math.floor(i / 4);
              const min = (i % 4) * 15;
              const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

              const selectedDateObj = new Date(selectedDate + 'T12:00:00');
              const dayConfig = selectedBarber?.work_days?.[selectedDateObj.getDay().toString()];

              if (!dayConfig || !dayConfig.active) return null;

              const slotMin = timeToMinutes(timeStr);
              const shopOpenMin = shopSettings ? timeToMinutes(shopSettings.opening_time) : 0;
              const shopCloseMin = shopSettings ? timeToMinutes(shopSettings.closing_time) : 1440;
              const barberStart = timeToMinutes(dayConfig.start);
              const barberEnd = timeToMinutes(dayConfig.end);
              const isOutsideShop = slotMin < shopOpenMin || (slotMin + totalDuration) > shopCloseMin;
              const isOutsideBarber = slotMin < barberStart || (slotMin + totalDuration) > barberEnd;
              const isOccupied = isRangeOccupied(selectedDate, timeStr, selectedBarber!.name, totalDuration);
              const isPastTime = selectedDate === todayStr && slotMin <= currentTotalMinutes;
              const isReserving = isSlotReserving(selectedBarber!.id, selectedDate, timeStr);

              if (isOutsideShop || isOutsideBarber) return null;

              return (
                <button
                  key={i}
                  disabled={isOccupied || isPastTime || isReserving}
                  onClick={() => setSelectedTime(timeStr)}
                  className={`py-3 rounded-xl border transition-all text-[11px] font-black italic 
                  ${selectedTime === timeStr
                      ? 'bg-amber-500 text-black border-amber-500 scale-105 shadow-lg shadow-amber-500/20'
                      : (isOccupied || isPastTime)
                        ? 'opacity-20 line-through cursor-not-allowed bg-zinc-950 border-zinc-900'
                        : isReserving
                          ? 'opacity-50 cursor-not-allowed bg-zinc-900 border-amber-500/50 animate-pulse'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-amber-500/50'
                    }`}
                >
                  {timeStr}
                  {isReserving && <span className="ml-1">⏳</span>}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-4">
          <button onClick={() => setStep(2)} className="flex-1 bg-zinc-800 font-black py-4 rounded-2xl text-white uppercase italic text-xs">Voltar</button>
          <button
            disabled={!selectedDate || !selectedTime}
            onClick={() => setStep(4)}
            className="flex-1 bg-amber-500 text-black font-black py-4 rounded-2xl uppercase italic text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próximo
          </button>
        </div>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <h3 className="text-xl md:text-2xl font-black text-amber-500 text-center uppercase italic tracking-tighter">Seus dados</h3>
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Nome Completo"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 md:p-5 text-white font-black italic outline-none focus:border-amber-500 text-sm"
        />

        {/* ✅ NOVO: Campo de telefone com indicador de assinante */}
        <div className="relative">
          <input
            type="tel"
            placeholder="WhatsApp"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
            className={`w-full bg-zinc-950 border rounded-2xl p-4 md:p-5 text-white font-black italic outline-none text-sm pr-12
              ${checkingSubscriber
                ? 'border-blue-500/50 animate-pulse'
                : isSubscriber
                  ? 'border-purple-500 bg-purple-500/5'
                  : 'border-zinc-800 focus:border-amber-500'
              }`}
          />

          {/* ✅ NOVO: Indicador de assinante */}
          {checkingSubscriber && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 size={20} className="animate-spin text-blue-500" />
            </div>
          )}

          {!checkingSubscriber && isSubscriber && subscriberInfo && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Crown size={20} className="text-purple-500" />
            </div>
          )}
        </div>

        {/* ✅ NOVO: Card de informações do assinante */}
        {isSubscriber && subscriberInfo && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-purple-400">
              <Crown size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">ASSINANTE {subscriberInfo.planName}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[9px] text-zinc-400 uppercase">Créditos restantes</span>
              <span className="text-sm font-black text-purple-400">{subscriberInfo.remainingServices}</span>
            </div>

            {subscriberInfo.remainingServices > 0 && (
              <button
                onClick={() => setSubscriberInfo({
                  ...subscriberInfo,
                  willUseSubscription: !subscriberInfo.willUseSubscription
                })}
                className={`w-full py-3 rounded-xl text-[9px] font-black uppercase transition-all border
                  ${subscriberInfo.willUseSubscription
                    ? 'bg-purple-500 text-white border-purple-500'
                    : 'bg-transparent text-purple-400 border-purple-500/30 hover:bg-purple-500/10'
                  }`}
              >
                {subscriberInfo.willUseSubscription
                  ? '✓ Usar crédito do plano'
                  : 'Usar crédito do plano (R$ 0,00)'}
              </button>
            )}

            {subscriberInfo.willUseSubscription && (
              <p className="text-[8px] text-green-500 text-center">
                ✅ Este serviço será descontado do seu plano!
              </p>
            )}
          </div>
        )}

        {/* ✅ NOVO: Aviso quando não tem créditos */}
        {isSubscriber && subscriberInfo?.remainingServices === 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
            <p className="text-[9px] text-red-400 text-center font-black uppercase">
              ⚠️ Você já utilizou todos os créditos do seu plano este mês
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setStep(3)}
          className="flex-1 bg-zinc-800 font-black py-4 rounded-2xl text-white uppercase italic text-xs"
        >
          Voltar
        </button>
        <button
          disabled={
            customerName.length < 3 ||
            customerPhone.length < 14 ||
            sendingWhatsApp ||
            checkingSubscriber
          }
          onClick={handleFinalizeBooking}
          className={`flex-1 font-black py-4 rounded-2xl uppercase italic text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2
            ${isSubscriber && subscriberInfo?.willUseSubscription
              ? 'bg-purple-500 text-white'
              : 'bg-amber-500 text-black'
            }`}
        >
          {sendingWhatsApp ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Finalizando...
            </>
          ) : (
            isSubscriber && subscriberInfo?.willUseSubscription ? 'Agendar com Plano' : 'Finalizar'
          )}
        </button>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-8 text-center py-6 md:py-8 animate-in zoom-in duration-500">
      <div className="relative">
        <CheckCircle2 size={64} className={`mx-auto ${isSubscriber && subscriberInfo?.willUseSubscription ? 'text-purple-500' : 'text-amber-500'}`} />
        {isSubscriber && subscriberInfo?.willUseSubscription && (
          <Crown size={24} className="absolute -top-2 -right-2 text-purple-500 animate-pulse" />
        )}
      </div>

      <h3 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter">
        {isSubscriber && subscriberInfo?.willUseSubscription ? 'Agendado com Plano!' : 'Agendado!'}
      </h3>

      <div className={`p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border text-left space-y-4 shadow-2xl
        ${isSubscriber && subscriberInfo?.willUseSubscription
          ? 'bg-purple-900/20 border-purple-500/30'
          : 'bg-zinc-900/50 border-zinc-800'
        }`}>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-zinc-500 uppercase">Serviço</span>
          <span className="font-black italic text-sm">{selectedServices.map(s => s.name).join(', ')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-zinc-500 uppercase">Profissional</span>
          <span className="font-black italic text-sm">{selectedBarber?.name}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-zinc-500 uppercase">Data</span>
          <span className="font-black italic text-sm">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-zinc-500 uppercase">Horário</span>
          <span className="font-black italic text-sm">{selectedTime}</span>
        </div>

        {isSubscriber && subscriberInfo?.willUseSubscription && (
          <div className="pt-2 border-t border-purple-500/30 flex justify-between items-center">
            <span className="text-[10px] font-black text-purple-400 uppercase">Plano utilizado</span>
            <span className="text-sm font-black text-purple-400 italic">{subscriberInfo.planName}</span>
          </div>
        )}

        <div className="pt-4 border-t border-zinc-800 flex justify-between items-center">
          <span className="text-[10px] font-black text-zinc-500 uppercase">Total</span>
          <span className={`text-lg md:text-xl font-black italic
            ${isSubscriber && subscriberInfo?.willUseSubscription
              ? 'text-purple-500 line-through decoration-2'
              : 'text-amber-500'
            }`}>
            R$ {totalPrice.toFixed(2)}
          </span>
        </div>

        {isSubscriber && subscriberInfo?.willUseSubscription && (
          <div className="flex justify-end">
            <span className="text-sm font-black text-green-500 italic">R$ 0,00 (Crédito)</span>
          </div>
        )}
      </div>

      <button
        onClick={onComplete}
        className={`w-full font-black py-4 md:py-5 rounded-2xl uppercase italic text-sm
          ${isSubscriber && subscriberInfo?.willUseSubscription
            ? 'bg-purple-500 text-white'
            : 'bg-zinc-800 text-white'
          }`}
      >
        Concluir
      </button>
    </div>
  );

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 md:py-8 overflow-x-hidden">
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step === 5 && renderStep5()}
    </div>
  );
};

export default BookingFlow;
