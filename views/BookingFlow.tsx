import React, { useState, useEffect } from 'react';
import { BUSINESS_HOURS, SERVICES as DEFAULT_SERVICES, BARBERS as DEFAULT_BARBERS } from '../constants';
import { Service, Barber } from '../types';
import { Check, ArrowLeft, Calendar as CalendarIcon, Clock, CheckCircle2, User, Phone, Scissors, Loader2 } from 'lucide-react';
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
          const [barbersRes, servicesRes] = await Promise.all([
            supabase.from('barbers').select('*').eq('barbershop_id', barbershop.id).order('name'),
            supabase.from('services').select('*').eq('barbershop_id', barbershop.id).order('name')
          ]);

          if (barbersRes.data) setAvailableBarbers(barbersRes.data);
          if (servicesRes.data) setAvailableServices(servicesRes.data);
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBookingData();
  }, []);

  const timeToMinutes = (t: string) => {
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

  const handleFinalizeBooking = async () => {
    if (!selectedBarber || !currentBarbershopId) return;

    const newBooking = {
      customerName,
      customerPhone,
      service: selectedServices.map(s => s.name).join(', '),
      barber: selectedBarber.name,
      date: selectedDate,
      time: selectedTime,
      price: totalPrice,
      status: 'pendente' as const,
      barbershop_id: currentBarbershopId
    };

    try {
      await addAppointment(newBooking);
      setStep(5);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const formatPhone = (value: string) => {
    if (!value) return "";
    value = value.replace(/\D/g, "");
    value = value.replace(/(\d{2})(\d)/, "($1) $2");
    value = value.replace(/(\d{5})(\d)/, "$1-$2");
    return value.substring(0, 15);
  };

  const totalPrice = selectedServices.reduce((acc, s) => acc + Number(s.price), 0);

  // --- RENDERS ---

  const renderStep1 = () => (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <h3 className="text-2xl font-black text-amber-500 text-center uppercase italic tracking-tighter">O que vamos fazer?</h3>
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
            className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${selectedServices.find(s => s.id === service.id) ? 'bg-amber-500/10 border-amber-500' : 'bg-zinc-900 border-zinc-800'
              }`}
          >
            <div className="text-left">
              <p className="font-black text-white italic uppercase">{service.name}</p>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest italic">{service.duration}</p>
            </div>
            <span className="font-black text-amber-500 italic">R$ {Number(service.price).toFixed(2)}</span>
          </button>
        ))}
      </div>
      <button disabled={selectedServices.length === 0} onClick={() => setStep(2)} className="w-full bg-amber-500 text-black font-black py-5 rounded-2xl uppercase italic">Continuar</button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <h3 className="text-2xl font-black text-amber-500 text-center uppercase italic tracking-tighter">Qual profissional?</h3>
      <div className="grid grid-cols-2 gap-4">
        {availableBarbers.map(barber => (
          <button
            key={barber.id}
            onClick={() => setSelectedBarber(barber)}
            className={`flex flex-col items-center p-6 rounded-[2rem] border transition-all ${selectedBarber?.id === barber.id ? 'bg-amber-500/10 border-amber-500 shadow-lg' : 'bg-zinc-900 border-zinc-800'
              }`}
          >
            <img src={barber.photo} className="w-20 h-20 rounded-full mb-3 object-cover grayscale hover:grayscale-0 transition-all" alt={barber.name} />
            <span className="font-black text-white italic uppercase text-xs">{barber.name}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-4">
        <button onClick={() => setStep(1)} className="flex-1 bg-zinc-800 font-black py-4 rounded-2xl text-white uppercase italic">Voltar</button>
        <button disabled={!selectedBarber} onClick={() => setStep(3)} className="flex-1 bg-amber-500 text-black font-black py-4 rounded-2xl uppercase italic">Próximo</button>
      </div>
    </div>
  );

  const renderStep3 = () => {
    const today = new Date();
    // String de comparação YYYY-MM-DD
    const todayStr = today.toISOString().split('T')[0];
    const currentHour = today.getHours();
    const currentMinutes = today.getMinutes();

    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
        <h3 className="text-2xl font-black text-amber-500 text-center uppercase italic tracking-tighter italic">Melhor horário?</h3>

        {/* SELETOR DE DATAS: 30 DIAS PARA FRENTE */}
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          {Array.from({ length: 30 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i);
            const dateStr = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });
            const value = d.toISOString().split('T')[0];

            const dayOfWeek = d.getDay().toString();
            const isWorkingDay = selectedBarber?.work_days?.[dayOfWeek]?.active;
            const isToday = value === todayStr;

            return (
              <button
                key={i}
                disabled={!isWorkingDay}
                onClick={() => { setSelectedDate(value); setSelectedTime(''); }}
                className={`flex-shrink-0 w-20 py-5 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 ${selectedDate === value
                    ? 'bg-amber-500 text-black border-amber-500 shadow-lg'
                    : !isWorkingDay
                      ? 'opacity-10 bg-black border-zinc-900 cursor-not-allowed'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
              >
                <p className="text-[9px] uppercase font-black italic">{dateStr.split(' ')[0]}</p>
                <p className="text-xl font-black italic">{dateStr.split(' ')[1]}</p>
                {isToday && isWorkingDay && <span className="text-[7px] font-black uppercase text-black bg-white px-1 rounded italic">Hoje</span>}
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

              const dayOfWeek = new Date(selectedDate + 'T12:00:00').getDay().toString();
              const dayConfig = selectedBarber?.work_days?.[dayOfWeek];

              if (!dayConfig) return null;

              const slotMin = timeToMinutes(timeStr);
              const startMin = timeToMinutes(dayConfig.start);
              const endMin = timeToMinutes(dayConfig.end);

              const isOutsideHours = slotMin < startMin || slotMin >= endMin;
              const isOccupied = isTimeSlotOccupied(selectedDate, timeStr, selectedBarber!.name);

              // TRAVA: Se for hoje, bloqueia horários que já passaram
              const isPastTime = selectedDate === todayStr && (hour < currentHour || (hour === currentHour && min <= currentMinutes));

              if (isOutsideHours) return null;

              const isDisabled = isOccupied || isPastTime;

              return (
                <button
                  key={i}
                  disabled={isDisabled}
                  onClick={() => setSelectedTime(timeStr)}
                  className={`py-3 rounded-xl border transition-all text-[11px] font-black italic ${selectedTime === timeStr
                      ? 'bg-amber-500 text-black border-amber-500'
                      : isDisabled
                        ? 'opacity-20 bg-black border-zinc-900 cursor-not-allowed line-through'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-amber-500/50'
                    }`}
                >
                  {timeStr}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-4">
          <button onClick={() => setStep(2)} className="flex-1 bg-zinc-800 font-black py-4 rounded-2xl text-white uppercase italic">Voltar</button>
          <button
            disabled={!selectedDate || !selectedTime}
            onClick={() => setStep(4)}
            className="flex-1 bg-amber-500 text-black font-black py-4 rounded-2xl uppercase italic"
          >
            Próximo
          </button>
        </div>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 text-center">
      <h3 className="text-2xl font-black text-amber-500 uppercase tracking-tighter italic">Seus dados</h3>
      <div className="space-y-4 text-left">
        <input type="text" placeholder="Nome Completo" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-white font-black italic outline-none focus:border-amber-500" />
        <input type="tel" placeholder="WhatsApp" value={customerPhone} onChange={(e) => setCustomerPhone(formatPhone(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-white font-black italic outline-none focus:border-amber-500" />
      </div>
      <div className="flex gap-4">
        <button onClick={() => setStep(3)} className="flex-1 bg-zinc-800 font-black py-4 rounded-2xl text-white uppercase italic">Voltar</button>
        <button disabled={customerName.length < 3 || customerPhone.length < 14} onClick={handleFinalizeBooking} className="flex-1 bg-amber-500 text-black font-black py-4 rounded-2xl uppercase italic">Finalizar</button>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-8 text-center py-8 animate-in zoom-in duration-500">
      <CheckCircle2 size={64} className="text-amber-500 mx-auto" />
      <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">Enviado para aprovação!</h3>
      <div className="bg-zinc-900/50 p-10 rounded-[3rem] border border-zinc-800 text-left space-y-6 shadow-2xl backdrop-blur-sm mx-auto w-full max-w-lg">
        {/* Profissional */}
        <div className="flex justify-between items-center border-b border-zinc-800/50 pb-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Profissional</span>
            <span className="text-xl font-black text-white uppercase italic tracking-tighter">{selectedBarber?.name}</span>
          </div>
          <div className="bg-amber-500/10 p-3 rounded-full">
            <User className="text-amber-500" size={24} />
          </div>
        </div>

        {/* Data e Hora */}
        <div className="flex justify-between items-center border-b border-zinc-800/50 pb-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Data e Horário</span>
            <span className="text-xl font-black text-white uppercase italic tracking-tighter">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às {selectedTime}
            </span>
          </div>
          <div className="bg-amber-500/10 p-3 rounded-full">
            <Clock className="text-amber-500" size={24} />
          </div>
        </div>

        {/* Valor Total */}
        <div className="flex justify-between items-end pt-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Total do Serviço</span>
            <span className="text-4xl font-black text-amber-500 italic tracking-tighter">
              R$ {totalPrice.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
      <button onClick={onComplete} className="w-full bg-zinc-800 text-white font-black py-5 rounded-2xl uppercase italic">Início</button>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step === 5 && renderStep5()}
    </div>
  );
};

export default BookingFlow;