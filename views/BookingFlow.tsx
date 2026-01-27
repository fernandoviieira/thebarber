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

          if (barbersRes.data && barbersRes.data.length > 0) setAvailableBarbers(barbersRes.data);
          else setAvailableBarbers(DEFAULT_BARBERS);

          if (servicesRes.data && servicesRes.data.length > 0) setAvailableServices(servicesRes.data);
          else setAvailableServices(DEFAULT_SERVICES);
        }
      } catch (err) {
        console.error("Erro ao carregar dados iniciais:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBookingData();
  }, []);

  const isTimeWithinWorkingHours = (time: string, workHours: string) => {
    if (!workHours) return true;
    const [start, end] = workHours.split(' - ');
    const [startHour] = start.split(':').map(Number);
    const [endHour] = end.split(':').map(Number);
    const [currentHour] = time.split(':').map(Number);
    return currentHour >= startHour && currentHour < endHour;
  };

  const isSunday = (dateString: string) => {
    if (!dateString) return false;
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getDay() === 0;
  };

  const isTimeSlotOccupied = (date: string, time: string, barberName: string) => {
    return appointments.some(app => 
      app.date === date && 
      app.time === time && 
      app.barber === barberName &&
      app.barbershop_id === currentBarbershopId 
    );
  };

  const handleFinalizeBooking = async () => {
    if (!selectedBarber || selectedServices.length === 0 || !currentBarbershopId) {
       return alert("Erro: Unidade não identificada. Recarregue a página.");
    }

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
      console.error("Erro ao salvar:", err);
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

  const renderStep1 = () => (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <h3 className="text-2xl font-serif font-bold text-amber-500 text-center uppercase tracking-tighter">O que vamos fazer?</h3>
      <div className="space-y-3">
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
            className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${
              selectedServices.find(s => s.id === service.id) ? 'bg-amber-500/10 border-amber-500 shadow-lg' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="text-left">
              <p className="font-bold text-lg text-white">{service.name}</p>
              <p className="text-xs text-zinc-500 flex items-center gap-1"><Clock size={12} /> {service.duration}</p>
            </div>
            <span className="font-black text-amber-500 text-lg">R$ {Number(service.price).toFixed(2)}</span>
          </button>
        ))}
      </div>
      <button disabled={selectedServices.length === 0} onClick={() => setStep(2)} className="w-full bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-black py-5 rounded-2xl shadow-xl shadow-amber-500/10 active:scale-95 transition-all">Continuar</button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <h3 className="text-2xl font-serif font-bold text-amber-500 text-center uppercase tracking-tighter">Com qual profissional?</h3>
      <div className="grid grid-cols-2 gap-4">
        {availableBarbers.map(barber => (
          <button
            key={barber.id}
            onClick={() => setSelectedBarber(barber)}
            className={`flex flex-col items-center p-6 rounded-[2rem] border transition-all ${
              selectedBarber?.id === barber.id ? 'bg-amber-500/10 border-amber-500 shadow-lg' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <img src={barber.photo} className="w-24 h-24 rounded-full mb-4 object-cover border-2 border-zinc-800 shadow-md" alt={barber.name} />
            <span className="font-bold text-white text-center">{barber.name}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-4">
        <button onClick={() => setStep(1)} className="flex-1 bg-zinc-800 font-bold py-4 rounded-2xl text-white hover:bg-zinc-700">Voltar</button>
        <button disabled={!selectedBarber} onClick={() => setStep(3)} className="flex-1 bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-black py-4 rounded-2xl">Próximo</button>
      </div>
    </div>
  );

const renderStep3 = () => {
    const today = new Date();
    // Ajuste para garantir a comparação correta da data local
    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const currentHour = today.getHours();
    const currentMinutes = today.getMinutes();

    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
        <h3 className="text-2xl font-serif font-bold text-amber-500 text-center uppercase tracking-tighter">Melhor horário?</h3>
        
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          {[0, 1, 2, 3, 4, 5, 6].map(i => {
            const d = new Date(); d.setDate(d.getDate() + i);
            const dateStr = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });
            const value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            const isSun = d.getDay() === 0;
            const isToday = value === todayStr;

            return (
              <button 
                key={i} 
                disabled={isSun} // REMOVIDO O isToday DAQUI PARA LIBERAR O DIA
                onClick={() => { setSelectedDate(value); setSelectedTime(''); }} 
                className={`flex-shrink-0 w-24 py-5 rounded-2xl border transition-all flex flex-col items-center gap-1 ${
                  selectedDate === value 
                    ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-lg' 
                    : isSun
                      ? 'opacity-20 bg-black border-zinc-900 cursor-not-allowed' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                <p className="text-[10px] uppercase font-black">{dateStr.split(' ')[0]}</p>
                <p className="text-2xl font-black">{dateStr.split(' ')[1]}</p>
                {isSun && <span className="text-[8px] font-bold uppercase mt-1">Fechado</span>}
                {isToday && <span className="text-[8px] font-bold uppercase mt-1 text-amber-500">Hoje</span>}
              </button>
            );
          })}
        </div>
        
        {/* ALTERADO: Agora só mostra "Fechado" se for domingo. Se for hoje, ele tenta mostrar os horários disponíveis */}
        {selectedDate && isSunday(selectedDate) ? (
          <div className="py-10 text-center bg-zinc-900/50 rounded-3xl border border-zinc-800">
            <p className="text-zinc-500 font-bold">Não abrimos aos domingos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 24 }, (_, hour) => {
              const timeStr = `${hour.toString().padStart(2, '0')}:00`;
              if (hour < 8 || hour >= 19) return null; 

              const isOccupied = selectedBarber && selectedDate 
                ? isTimeSlotOccupied(selectedDate, timeStr, selectedBarber.name) 
                : false;

              const isOutsideWorkHours = selectedBarber?.work_hours 
                ? !isTimeWithinWorkingHours(timeStr, selectedBarber.work_hours) 
                : false;

              // NOVA TRAVA: Se for hoje, desabilita horários que já passaram
              const isPastTime = selectedDate === todayStr && hour <= currentHour;

              const isDisabled = isOccupied || isOutsideWorkHours || isPastTime;

              return (
                <button 
                  key={hour} 
                  disabled={isDisabled} 
                  onClick={() => setSelectedTime(timeStr)} 
                  className={`py-4 rounded-xl border transition-all text-sm font-black flex flex-col items-center justify-center ${
                    selectedTime === timeStr 
                    ? 'bg-amber-500 text-zinc-950 border-amber-500 scale-105 shadow-lg' 
                    : isDisabled 
                      ? 'opacity-20 bg-black border-zinc-900 cursor-not-allowed grayscale' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-amber-500/50'
                  }`}
                >
                  <span className={isDisabled ? 'line-through' : ''}>{timeStr}</span>
                  {isOccupied && <span className="text-[8px] uppercase mt-1">Ocupado</span>}
                  {isPastTime && !isOccupied && <span className="text-[8px] uppercase mt-1">Passou</span>}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-4">
          <button onClick={() => setStep(2)} className="flex-1 bg-zinc-800 font-bold py-4 rounded-2xl text-white">Voltar</button>
          <button 
            disabled={!selectedDate || !selectedTime || isSunday(selectedDate)} 
            onClick={() => setStep(4)} 
            className="flex-1 bg-amber-500 disabled:bg-zinc-800 text-zinc-950 font-black py-4 rounded-2xl shadow-lg"
          >
            Próximo
          </button>
        </div>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <h3 className="text-2xl font-serif font-bold text-amber-500 text-center uppercase tracking-tighter">Seus dados</h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Nome Completo</label>
          <input type="text" placeholder="Como quer ser chamado?" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-white outline-none focus:border-amber-500 transition-all shadow-inner" />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">WhatsApp</label>
          <input type="tel" placeholder="(00) 00000-0000" value={customerPhone} onChange={(e) => setCustomerPhone(formatPhone(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-white outline-none focus:border-amber-500 transition-all shadow-inner" />
        </div>
      </div>
      <div className="flex gap-4 pt-4">
        <button onClick={() => setStep(3)} className="flex-1 bg-zinc-800 font-bold py-4 rounded-2xl text-white">Voltar</button>
        <button disabled={customerName.length < 3 || customerPhone.length < 14} onClick={handleFinalizeBooking} className="flex-1 bg-amber-500 disabled:bg-zinc-800 text-zinc-950 font-black py-4 rounded-2xl shadow-xl shadow-amber-500/20">Finalizar</button>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-8 text-center py-8 animate-in zoom-in duration-500">
      <div className="bg-amber-500/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
        <CheckCircle2 size={48} className="text-amber-500" />
      </div>
      <div>
        <h3 className="text-4xl font-serif font-black text-white tracking-tight uppercase">Tudo pronto!</h3>
        <p className="text-zinc-500 mt-2">Agendamento realizado com sucesso.</p>
      </div>
      <div className="bg-zinc-900/50 p-8 rounded-[2.5rem] border border-zinc-800 text-left space-y-4 shadow-2xl backdrop-blur-sm">
        <div className="flex justify-between items-center border-b border-zinc-800/50 pb-3">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Profissional</span>
          <span className="text-white font-bold">{selectedBarber?.name}</span>
        </div>
        <div className="flex justify-between items-center border-b border-zinc-800/50 pb-3">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Data e Hora</span>
          <span className="text-white font-bold">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')} às {selectedTime}</span>
        </div>
        <div className="flex justify-between items-center pt-2">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Valor</span>
          <span className="text-amber-500 font-black text-2xl tracking-tighter italic">R$ {totalPrice.toFixed(2)}</span>
        </div>
      </div>
      <button onClick={onComplete} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-black py-5 rounded-2xl transition-all">Voltar ao Início</button>
    </div>
  );

  if (loading) return (
    <div className="py-32 flex flex-col items-center gap-6">
      <div className="relative">
        <Loader2 className="animate-spin text-amber-500" size={56} />
        <div className="absolute inset-0 blur-xl bg-amber-500/20 rounded-full" />
      </div>
      <p className="text-amber-500 font-black uppercase text-xs tracking-[0.3em] animate-pulse">Sincronizando Agenda...</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-32">
      <div className="flex items-center gap-6 mb-12">
        <button onClick={onCancel} className="p-3 bg-zinc-900 text-amber-500 rounded-2xl border border-zinc-800 hover:bg-zinc-800 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
          <div className="h-full bg-amber-500 transition-all duration-700 shadow-[0_0_15px_rgba(245,158,11,0.5)]" style={{ width: `${(step / 5) * 100}%` }} />
        </div>
      </div>
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step === 5 && renderStep5()}
    </div>
  );
};

export default BookingFlow;