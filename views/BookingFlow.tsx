import React, { useState, useEffect } from 'react';
import { Service, Barber } from '../types';
import { 
  Check, ArrowLeft, Calendar as CalendarIcon, Clock, 
  CheckCircle2, User, Phone, Scissors, Loader2, AlertTriangle 
} from 'lucide-react';
import { useBooking } from './BookingContext';
import { supabase } from '@/lib/supabase';

interface BookingFlowProps {
  onComplete: () => void;
  onCancel: () => void;
}

const BookingFlow: React.FC<BookingFlowProps> = ({ onComplete, onCancel }) => {
  const { addAppointment, appointments } = useBooking();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);

  const [currentBarbershopId, setCurrentBarbershopId] = useState<string | null>(null);
  const [availableBarbers, setAvailableBarbers] = useState<Barber[]>([]);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  
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

  useEffect(() => {
    async function loadBookingData() {
      setLoading(true);
      try {
        const slug = window.location.pathname.split('/')[1];
        const { data: barbershop } = await supabase
          .from('barbershops')
          .select('id')
          .eq('slug', slug)
          .single();

        if (barbershop) {
          setCurrentBarbershopId(barbershop.id);
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

  const handleFinalizeBooking = async () => {
    if (!selectedBarber || !currentBarbershopId) return;
    const totalDuration = selectedServices.reduce((acc, s) => {
      const d = typeof s.duration === 'string' 
        ? parseInt(s.duration.replace(/\D/g, '')) 
        : s.duration;
      return acc + (Number(d) || 0);
    }, 0);

    const newBooking = {
      customerName,
      customerPhone,
      service: selectedServices.map(s => s.name).join(', '),
      barber: selectedBarber.name,
      date: selectedDate,
      time: selectedTime,
      price: totalPrice,
      status: 'pendente' as const,
      barbershop_id: currentBarbershopId,
      duration: totalDuration,
      created_by_admin: false
    };

    try {
      await addAppointment(newBooking as any);
      setStep(5);
    } catch (err: any) {
      alert(`Erro ao agendar: ${err.message}`);
    }
  };

  const timeToMinutes = (t: string) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const isTimeSlotOccupied = (date: string, time: string, barberName: string) => {
    return appointments.some(app =>
      app.date === date &&
      app.time === time &&
      app.barber === barberName &&
      app.status !== 'cancelado'
    );
  };

  const formatPhone = (value: string) => {
    if (!value) return "";
    value = value.replace(/\D/g, "");
    value = value.replace(/(\d{2})(\d)/, "($1) $2");
    value = value.replace(/(\d{5})(\d)/, "$1-$2");
    return value.substring(0, 15);
  };

  const totalPrice = selectedServices.reduce((acc, s) => acc + Number(s.price), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-amber-500 mb-4" size={40} />
        <p className="text-zinc-500 font-black uppercase italic text-xs tracking-widest">Carregando Agenda...</p>
      </div>
    );
  }

  if (shopSettings?.is_closed) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10 md:py-20 text-center animate-in zoom-in duration-500">
        <div className="bg-red-500/10 border border-red-500/20 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl backdrop-blur-md">
          <AlertTriangle size={64} className="text-red-500 mx-auto mb-6 animate-pulse" />
          <h3 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter">Unidade Fechada</h3>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-4 leading-relaxed">
            Não estamos aceitando novos agendamentos online no momento.
          </p>
          <button onClick={onCancel} className="mt-10 w-full bg-zinc-800 text-white font-black py-5 rounded-2xl uppercase italic">Voltar</button>
        </div>
      </div>
    );
  }

  const renderStep1 = () => (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <h3 className="text-xl md:text-2xl font-black text-amber-500 text-center uppercase italic tracking-tighter italic">O que vamos fazer?</h3>
      <div className="grid grid-cols-1 gap-3">
        {availableServices.map(service => (
          <button
            key={service.id}
            onClick={() => {
              if (selectedServices.find(s => s.id === service.id)) {
                setSelectedServices(selectedServices.filter(s => s.id !== service.id));
              } else {
                setSelectedServices([...selectedServices, service]);
              }
            }}
            className={`w-full flex items-center justify-between p-4 md:p-5 rounded-2xl border transition-all ${selectedServices.find(s => s.id === service.id) ? 'bg-amber-500/10 border-amber-500' : 'bg-zinc-900 border-zinc-800'}`}
          >
            <div className="text-left">
              <p className="font-black text-white italic uppercase text-sm md:text-base">{service.name}</p>
              <p className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest italic">{service.duration}</p>
            </div>
            <span className="font-black text-amber-500 italic text-sm md:text-base">R$ {Number(service.price).toFixed(2)}</span>
          </button>
        ))}
      </div>
      <button disabled={selectedServices.length === 0} onClick={() => setStep(2)} className="w-full bg-amber-500 text-black font-black py-4 md:py-5 rounded-2xl uppercase italic text-sm shadow-lg shadow-amber-500/20">Continuar</button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <h3 className="text-xl md:text-2xl font-black text-amber-500 text-center uppercase italic tracking-tighter italic">Qual profissional?</h3>
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {availableBarbers.map(barber => (
          <button
            key={barber.id}
            onClick={() => setSelectedBarber(barber)}
            className={`flex flex-col items-center p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border transition-all ${selectedBarber?.id === barber.id ? 'bg-amber-500/10 border-amber-500 shadow-lg' : 'bg-zinc-900 border-zinc-800'}`}
          >
            <img src={barber.photo} className="w-16 h-16 md:w-20 md:h-20 rounded-full mb-3 object-cover grayscale" alt={barber.name} />
            <span className="font-black text-white italic uppercase text-[10px] md:text-xs text-center">{barber.name}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-4">
        <button onClick={() => setStep(1)} className="flex-1 bg-zinc-800 font-black py-4 rounded-2xl text-white uppercase italic text-xs">Voltar</button>
        <button disabled={!selectedBarber} onClick={() => setStep(3)} className="flex-1 bg-amber-500 text-black font-black py-4 rounded-2xl uppercase italic text-xs">Próximo</button>
      </div>
    </div>
  );

  const renderStep3 = () => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
        <h3 className="text-xl md:text-2xl font-black text-amber-500 text-center uppercase italic tracking-tighter">Melhor horário?</h3>
        
        {/* Datas Responsivas */}
        <div className="flex gap-2 md:gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
          {Array.from({ length: 30 }, (_, i) => {
            const d = new Date(); d.setDate(d.getDate() + i);
            const dateStr = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });
            const value = d.toISOString().split('T')[0];
            const isWorkingDay = selectedBarber?.work_days?.[d.getDay().toString()]?.active;
            return (
              <button
                key={i} disabled={!isWorkingDay}
                onClick={() => { setSelectedDate(value); setSelectedTime(''); }}
                className={`flex-shrink-0 w-16 md:w-20 py-4 md:py-5 rounded-2xl border transition-all flex flex-col items-center justify-center ${selectedDate === value ? 'bg-amber-500 text-black border-amber-500 shadow-lg' : isWorkingDay ? 'bg-zinc-900 border-zinc-800' : 'opacity-10 grayscale cursor-not-allowed'}`}
              >
                <p className="text-[8px] md:text-[9px] uppercase font-black italic">{dateStr.split(' ')[0]}</p>
                <p className="text-lg md:text-xl font-black italic">{dateStr.split(' ')[1]}</p>
              </button>
            );
          })}
        </div>

        {selectedDate && (
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 24 * 4 }, (_, i) => {
              const hour = Math.floor(i / 4);
              const min = (i % 4) * 15;
              const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
              
              const dayConfig = selectedBarber?.work_days?.[new Date(selectedDate + 'T12:00:00').getDay().toString()];
              if (!dayConfig || !dayConfig.active) return null;

              const slotMin = timeToMinutes(timeStr);
              const shopOpenMin = shopSettings ? timeToMinutes(shopSettings.opening_time) : 0;
              const shopCloseMin = shopSettings ? timeToMinutes(shopSettings.closing_time) - 15 : 1425;
              const barberStart = timeToMinutes(dayConfig.start);
              const barberEnd = timeToMinutes(dayConfig.end) - 15;
              
              const isOutsideShop = slotMin < shopOpenMin || slotMin > shopCloseMin;
              const isOutsideBarber = slotMin < barberStart || slotMin > barberEnd;
              const isOccupied = isTimeSlotOccupied(selectedDate, timeStr, selectedBarber!.name);
              const isPastTime = selectedDate === todayStr && slotMin <= currentTotalMinutes;
              
              if (isOutsideShop || isOutsideBarber) return null;

              return (
                <button
                  key={i} 
                  disabled={isOccupied || isPastTime}
                  onClick={() => setSelectedTime(timeStr)}
                  className={`py-2.5 md:py-3 rounded-xl border transition-all text-[10px] md:text-[11px] font-black italic 
                    ${selectedTime === timeStr 
                      ? 'bg-amber-500 text-black border-amber-500 shadow-amber-500/20 shadow-lg scale-105' 
                      : (isOccupied || isPastTime) 
                        ? 'opacity-10 line-through cursor-not-allowed bg-black' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                >
                  {timeStr}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-4">
          <button onClick={() => setStep(2)} className="flex-1 bg-zinc-800 font-black py-4 rounded-2xl text-white uppercase italic text-xs">Voltar</button>
          <button disabled={!selectedDate || !selectedTime} onClick={() => setStep(4)} className="flex-1 bg-amber-500 text-black font-black py-4 rounded-2xl uppercase italic text-xs">Próximo</button>
        </div>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <h3 className="text-xl md:text-2xl font-black text-amber-500 text-center uppercase italic tracking-tighter italic">Seus dados</h3>
      <div className="space-y-4">
        <input type="text" placeholder="Nome Completo" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 md:p-5 text-white font-black italic outline-none focus:border-amber-500 text-sm" />
        <input type="tel" placeholder="WhatsApp" value={customerPhone} onChange={(e) => setCustomerPhone(formatPhone(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 md:p-5 text-white font-black italic outline-none focus:border-amber-500 text-sm" />
      </div>
      <div className="flex gap-4">
        <button onClick={() => setStep(3)} className="flex-1 bg-zinc-800 font-black py-4 rounded-2xl text-white uppercase italic text-xs">Voltar</button>
        <button disabled={customerName.length < 3 || customerPhone.length < 14} onClick={handleFinalizeBooking} className="flex-1 bg-amber-500 text-black font-black py-4 rounded-2xl uppercase italic text-xs">Finalizar</button>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-8 text-center py-6 md:py-8 animate-in zoom-in duration-500">
      <CheckCircle2 size={64} className="text-amber-500 mx-auto" />
      <h3 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter">Agendado!</h3>
      <div className="bg-zinc-900/50 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-zinc-800 text-left space-y-4 shadow-2xl">
        <div className="flex justify-between items-center"><span className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase">Profissional</span><span className="font-black italic text-sm">{selectedBarber?.name}</span></div>
        <div className="flex justify-between items-center"><span className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase">Data</span><span className="font-black italic text-sm">{new Date(selectedDate + 'T12:00:00').toLocaleDateString()}</span></div>
        <div className="flex justify-between items-center"><span className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase">Horário</span><span className="font-black italic text-sm">{selectedTime}</span></div>
        <div className="pt-4 border-t border-zinc-800 flex justify-between items-center"><span className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase">Total</span><span className="text-lg md:text-xl font-black text-amber-500 italic">R$ {totalPrice.toFixed(2)}</span></div>
      </div>
      <button onClick={onComplete} className="w-full bg-zinc-800 text-white font-black py-4 md:py-5 rounded-2xl uppercase italic text-sm">Concluir</button>
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