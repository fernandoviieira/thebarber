import React, { useState, useEffect, useRef } from 'react';
import { Service, Barber } from '../types';
import {
  Check, ArrowLeft, Calendar as CalendarIcon, Clock,
  CheckCircle2, User, Phone, Scissors, Loader2, AlertTriangle,
  Sparkles, Clock3, DollarSign
} from 'lucide-react';
import { useBooking } from './BookingContext';
import { supabase } from '@/lib/supabase';

interface BookingFlowProps {
  onComplete: () => void;
  onCancel: () => void;
}

const BookingFlow: React.FC<BookingFlowProps> = ({ onComplete, onCancel }) => {
  const { addAppointment, appointments, fetchAppointments, checkSlotAvailability, reservingSlots } = useBooking();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const servicesGridRef = useRef<HTMLDivElement>(null);

  const [currentBarbershopId, setCurrentBarbershopId] = useState<string | null>(null);
  const [availableBarbers, setAvailableBarbers] = useState<Barber[]>([]);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);

  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  const [shopSettings, setShopSettings] = useState<{
    is_closed: boolean;
    opening_time: string;
    closing_time: string;
  } | null>(null);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [barbershopPhone, setBarbershopPhone] = useState('');

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

  const totalDuration = selectedService ? (() => {
    const d = typeof selectedService.duration === 'string'
      ? parseInt(selectedService.duration.replace(/\D/g, ''))
      : selectedService.duration;
    return Number(d) || 0;
  })() : 0;

  const totalPrice = selectedService ? Number(selectedService.price) : 0;

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
    if (!selectedBarber || !currentBarbershopId || !selectedService) {
      console.warn("⚠️ [Booking] Tentativa de finalizar sem dados completos.");
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

    const newBooking = {
      customerName,
      customerPhone,
      service: selectedService.name,
      barber: selectedBarber.name,
      date: selectedDate,
      time: selectedTime,
      barber_id: selectedBarber.id,
      price: totalPrice,
      status: 'pendente' as const,
      barbershop_id: currentBarbershopId,
      duration: totalDuration,
      created_by_admin: false
    };

    const result = await addAppointment(newBooking as any);

    if (result.success) {
      setSendingWhatsApp(true);

      try {
        await fetchAppointments(currentBarbershopId);

        const payload = {
          number: customerPhone,
          shopNumber: barbershopPhone,
          message: `🔥 *AGENDAMENTO CONFIRMADO* 🔥\n\nOlá, ${customerName}!\n\n✂️ Serviço: ${newBooking.service}\n👨‍💼 Profissional: ${newBooking.barber}\n📅 Data: ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}\n🕐 Horário: ${selectedTime}\n💰 Valor: R$ ${totalPrice.toFixed(2)}`
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

  // Scroll suave para o topo da grade quando selecionar um serviço
  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    
    // Scroll suave para o topo da grade de serviços
    setTimeout(() => {
      if (servicesGridRef.current) {
        servicesGridRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-amber-500 mb-4" size={40} />
        <p className="text-zinc-500 font-black uppercase italic text-xs tracking-widest">Carregando Agenda...</p>
      </div>
    );
  }

  const renderStep1 = () => (
    <div className="space-y-4 animate-in slide-in-from-right duration-300 pb-32 relative">
      {/* Header fixo */}
      <div className="sticky top-0 bg-black/95 backdrop-blur-sm z-20 py-4 -mt-4 mb-2 border-b border-zinc-800">
        <h3 className="text-xl md:text-2xl font-black text-amber-500 text-center uppercase italic tracking-tighter">
          Escolha seu serviço
        </h3>
      </div>

      {/* Grid de serviços - com altura limitada e scroll */}
      <div 
        ref={servicesGridRef}
        className="grid grid-cols-2 gap-3 md:gap-4 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
      >
        {availableServices.map(service => {
          const isSelected = selectedService?.id === service.id;
          const durationText = typeof service.duration === 'string' 
            ? service.duration 
            : `${service.duration}min`;

          return (
            <button
              key={service.id}
              onClick={() => handleServiceSelect(service)}
              className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                isSelected
                  ? 'border-amber-500 bg-gradient-to-br from-amber-500/20 to-transparent shadow-lg shadow-amber-500/20'
                  : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900'
              }`}
            >
              {/* Efeito de brilho no hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transform-gpu" />
              
              <div className="relative p-4 flex flex-col items-center text-center gap-3">
                {/* Ícone do serviço */}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                  isSelected ? 'bg-amber-500' : 'bg-zinc-800 group-hover:bg-zinc-700'
                }`}>
                  <Scissors className={`w-8 h-8 transition-all ${
                    isSelected ? 'text-black rotate-12' : 'text-zinc-400'
                  }`} />
                </div>

                {/* Informações do serviço */}
                <div className="w-full">
                  <h4 className={`font-black text-sm md:text-base transition-colors line-clamp-2 ${
                    isSelected ? 'text-amber-500' : 'text-white'
                  }`}>
                    {service.name}
                  </h4>
                  
                  <div className="flex flex-col items-center gap-1 mt-2">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-500">
                      <Clock3 size={10} />
                      {durationText}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-black text-amber-500">
                      <DollarSign size={12} />
                      R$ {Number(service.price).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Indicador de seleção */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center animate-in zoom-in duration-200">
                    <Check size={14} className="text-black" />
                  </div>
                )}
              </div>

              {/* Barra decorativa superior para selecionado */}
              {isSelected && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 animate-in slide-in-from-top duration-300" />
              )}
            </button>
          );
        })}
      </div>

      {/* Mensagem quando não há serviços */}
      {availableServices.length === 0 && (
        <div className="text-center py-12">
          <p className="text-zinc-500 font-black uppercase italic text-sm">
            Nenhum serviço disponível no momento
          </p>
        </div>
      )}

      {/* Botão Continuar Flutuante/Suspenso */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black via-black to-transparent pt-8 pb-4 px-4">
        <div className="max-w-xl mx-auto">
          {/* Mini resumo quando serviço selecionado */}
          {selectedService && (
            <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded-2xl p-3 mb-3 animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <Scissors size={16} className="text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      Serviço selecionado
                    </p>
                    <p className="text-xs font-black text-white line-clamp-1">
                      {selectedService.name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block font-black text-amber-500">
                    R$ {totalPrice.toFixed(2)}
                  </span>
                  <span className="text-[8px] font-bold text-zinc-600">
                    {totalDuration}min
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Botão Continuar */}
          <button
            disabled={!selectedService}
            onClick={() => setStep(2)}
            className="w-full bg-amber-500 text-black font-black py-5 rounded-2xl uppercase italic text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-all shadow-2xl shadow-amber-500/30 flex items-center justify-center gap-3"
          >
            {selectedService ? (
              <>
                Continuar
              </>
            ) : (
              'Selecione um serviço'
            )}
          </button>

          {/* Botão Cancelar */}
          <button
            onClick={onCancel}
            className="w-full mt-2 text-zinc-600 font-black py-3 text-xs uppercase italic hover:text-zinc-400 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* Espaçamento inferior para compensar o botão fixo */}
      <div className="h-36" />
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-32 relative">
      <h3 className="text-xl md:text-2xl font-black text-amber-500 text-center uppercase italic tracking-tighter sticky top-0 bg-black/95 backdrop-blur-sm z-10 py-4 -mt-4 border-b border-zinc-800">
        Qual profissional?
      </h3>
      
      <div className="grid grid-cols-2 gap-3 md:gap-4 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
        {availableBarbers.map(barber => (
          <button
            key={barber.id}
            onClick={() => setSelectedBarber(barber)}
            className={`flex flex-col items-center p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border transition-all hover:scale-105 active:scale-95 ${
              selectedBarber?.id === barber.id
                ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/20'
                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full mb-3 bg-zinc-950 flex items-center justify-center border-2 border-zinc-800 shadow-inner">
              <Scissors size={48} className="text-amber-500 -rotate-45" />
            </div>
            <span className="font-black text-white italic uppercase text-[10px] md:text-xs text-center">
              {barber.name}
            </span>
          </button>
        ))}
      </div>

      {/* Botões fixos no rodapé */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black via-black to-transparent pt-8 pb-4 px-4">
        <div className="max-w-xl mx-auto">
          <div className="flex gap-4">
            <button
              onClick={() => setStep(1)}
              className="flex-1 bg-zinc-800 font-black py-5 rounded-2xl text-white uppercase italic text-sm hover:bg-zinc-700 transition-all"
            >
              Voltar
            </button>
            <button
              disabled={!selectedBarber}
              onClick={() => setStep(3)}
              className="flex-1 bg-amber-500 text-black font-black py-5 rounded-2xl uppercase italic text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-all"
            >
              Próximo
            </button>
          </div>
        </div>
      </div>
      
      <div className="h-24" />
    </div>
  );

  const renderStep3 = () => {
    const { dateStr: todayStr, timeStr: brasiliaTime } = getBrasiliaDateTime();
    const [nowH, nowM] = brasiliaTime.split(':').map(Number);
    const currentTotalMinutes = nowH * 60 + nowM;

    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-32 relative">
        <h3 className="text-xl md:text-2xl font-black text-amber-500 text-center uppercase italic tracking-tighter sticky top-0 bg-black/95 backdrop-blur-sm z-10 py-4 -mt-4 border-b border-zinc-800">
          Escolha o Horário
        </h3>

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
                className={`flex-shrink-0 w-16 md:w-20 py-4 md:py-5 rounded-2xl border transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center ${
                  selectedDate === value
                    ? 'bg-amber-500 text-black border-amber-500 shadow-lg'
                    : isWorkingDay
                      ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
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
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-[40vh] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-zinc-800">
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
                  className={`py-3 rounded-xl border transition-all text-[11px] font-black italic hover:scale-105 active:scale-95
                  ${selectedTime === timeStr
                      ? 'bg-amber-500 text-black border-amber-500 scale-105 shadow-lg shadow-amber-500/20'
                      : (isOccupied || isPastTime)
                        ? 'opacity-20 line-through cursor-not-allowed bg-zinc-950 border-zinc-900'
                        : isReserving
                          ? 'opacity-50 cursor-not-allowed bg-zinc-900 border-amber-500/50 animate-pulse'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-amber-500/50 hover:text-white'
                    }`}
                >
                  {timeStr}
                  {isReserving && <span className="ml-1">⏳</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Botões fixos no rodapé */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black via-black to-transparent pt-8 pb-4 px-4">
          <div className="max-w-xl mx-auto">
            <div className="flex gap-4">
              <button 
                onClick={() => setStep(2)} 
                className="flex-1 bg-zinc-800 font-black py-5 rounded-2xl text-white uppercase italic text-sm hover:bg-zinc-700 transition-all"
              >
                Voltar
              </button>
              <button
                disabled={!selectedDate || !selectedTime}
                onClick={() => setStep(4)}
                className="flex-1 bg-amber-500 text-black font-black py-5 rounded-2xl uppercase italic text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-all"
              >
                Próximo
              </button>
            </div>
          </div>
        </div>
        
        <div className="h-24" />
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-32 relative">
      <h3 className="text-xl md:text-2xl font-black text-amber-500 text-center uppercase italic tracking-tighter sticky top-0 bg-black/95 backdrop-blur-sm z-10 py-4 -mt-4 border-b border-zinc-800">
        Seus dados
      </h3>
      
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Nome Completo"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 md:p-5 text-white font-black italic outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 text-sm transition-all"
        />
        <input
          type="tel"
          placeholder="WhatsApp"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 md:p-5 text-white font-black italic outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 text-sm transition-all"
        />
      </div>

      {/* Botões fixos no rodapé */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black via-black to-transparent pt-8 pb-4 px-4">
        <div className="max-w-xl mx-auto">
          <div className="flex gap-4">
            <button
              onClick={() => setStep(3)}
              className="flex-1 bg-zinc-800 font-black py-5 rounded-2xl text-white uppercase italic text-sm hover:bg-zinc-700 transition-all"
            >
              Voltar
            </button>
            <button
              disabled={customerName.length < 3 || customerPhone.length < 14 || sendingWhatsApp}
              onClick={handleFinalizeBooking}
              className="flex-1 bg-amber-500 text-black font-black py-5 rounded-2xl uppercase italic text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-all flex items-center justify-center gap-2"
            >
              {sendingWhatsApp ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Finalizando...
                </>
              ) : (
                'Finalizar'
              )}
            </button>
          </div>
        </div>
      </div>
      
      <div className="h-24" />
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-8 text-center py-6 md:py-8 animate-in zoom-in duration-500">
      <CheckCircle2 size={64} className="text-amber-500 mx-auto" />
      <h3 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter">Agendado!</h3>
      <div className="bg-zinc-900/50 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-zinc-800 text-left space-y-4 shadow-2xl">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-zinc-500 uppercase">Serviço</span>
          <span className="font-black italic text-sm">{selectedService?.name}</span>
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
        <div className="pt-4 border-t border-zinc-800 flex justify-between items-center">
          <span className="text-[10px] font-black text-zinc-500 uppercase">Total</span>
          <span className="text-lg md:text-xl font-black text-amber-500 italic">R$ {totalPrice.toFixed(2)}</span>
        </div>
      </div>
      <button
        onClick={onComplete}
        className="w-full bg-zinc-800 text-white font-black py-4 md:py-5 rounded-2xl uppercase italic text-sm hover:bg-zinc-700 transition-all"
      >
        Concluir
      </button>
    </div>
  );

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 md:py-8 overflow-x-hidden min-h-screen">
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step === 5 && renderStep5()}
    </div>
  );
};

export default BookingFlow;