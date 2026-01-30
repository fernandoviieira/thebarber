import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Plus,
  X,
  User,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import {
  addDays,
  startOfWeek,
  format,
  addWeeks,
  subWeeks,
  subDays,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ViewMode = 'day' | 'week';

type Barber = {
  id?: string;
  name: string;
};

type Service = {
  id: string;
  name: string;
  price: number | string;
  duration: number | string;
};

type AppointmentStatus = 'confirmado' | 'finalizado' | 'cancelado' | string;

type Appointment = {
  id: string;
  customerName: string;
  barber: string; // atual: por nome
  time: string; // HH:mm
  service: string;
  price?: number;
  date: string; // yyyy-MM-dd
  duration?: number | string;
  status?: AppointmentStatus;
  created_by_admin?: boolean;
  venda_id?: string | null;
};

interface CalendarProps {
  barbers: Barber[];
  appointments: Appointment[];
  services: Service[];
  barbershopId: string;
  selectedDate?: Date;
  onSave: (newAppointment: any) => Promise<void>;
  onDelete: (appointmentId: string) => Promise<void>;
  onUpdate: (appointmentId: string, updates: any) => Promise<void>;
  onFinalize: (appointment: any) => void;
}

const normalize = (v?: string) => (v || '').trim().toLowerCase();

const AdminCalendarView: React.FC<CalendarProps> = ({
  barbers = [],
  appointments = [],
  services = [],
  barbershopId,
  selectedDate,
  onSave,
  onDelete,
  onUpdate,
  onFinalize
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(false);
  const [draggingAppId, setDraggingAppId] = useState<string | null>(null);

  // No modo semana, exibimos "semana de UM barbeiro"
  const [selectedBarberForWeek, setSelectedBarberForWeek] = useState<string>('');

  const [openingTime, setOpeningTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('20:00');

  const [newBooking, setNewBooking] = useState({
    customerName: '',
    barber: '',
    time: '',
    service: '',
    price: 0,
    date: '',
    duration: 30
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('barbershop_settings')
        .select('opening_time, closing_time')
        .eq('barbershop_id', barbershopId)
        .maybeSingle();

      if (!error && data) {
        if (data.opening_time) setOpeningTime(String(data.opening_time).slice(0, 5));
        if (data.closing_time) setClosingTime(String(data.closing_time).slice(0, 5));
      }
    };

    if (barbershopId) fetchSettings();
  }, [barbershopId]);

  useEffect(() => {
    if (selectedDate) setCurrentDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    // garante barbeiro default no modo semana
    if (barbers.length > 0 && !selectedBarberForWeek) {
      setSelectedBarberForWeek(barbers[0].name);
    }
  }, [barbers, selectedBarberForWeek]);

  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const [startHour] = openingTime.split(':').map(Number);
    const [endHour] = closingTime.split(':').map(Number);

    // Observação: isso ignora minutos no horário de abertura/fechamento (08:30 etc).
    // Se você precisar disso, eu adapto depois.
    for (let hour = startHour; hour <= endHour; hour++) {
      for (const min of ['00', '15', '30', '45']) {
        if (hour === endHour && min !== '00') break;
        slots.push(`${hour.toString().padStart(2, '0')}:${min}`);
      }
    }
    return slots;
  }, [openingTime, closingTime]);

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 0 }), [currentDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const navigateNext = () =>
    setCurrentDate(viewMode === 'day' ? addDays(currentDate, 1) : addWeeks(currentDate, 1));
  const navigatePrev = () =>
    setCurrentDate(viewMode === 'day' ? subDays(currentDate, 1) : subWeeks(currentDate, 1));

  const getServiceDurationWithRespiro = (appointment: Appointment | null) => {
    if (!appointment) return 35; // 30 + 5
    if (appointment.duration != null && appointment.duration !== '') {
      const d = typeof appointment.duration === 'string'
        ? parseInt(appointment.duration.replace(/\D/g, ''), 10)
        : Number(appointment.duration);
      return (Number.isFinite(d) ? d : 30) + 5;
    }

    const serviceFromTable = services.find(
      s => normalize(s.name) === normalize(appointment.service)
    );

    const raw = serviceFromTable?.duration;
    const parsed = raw == null
      ? 30
      : typeof raw === 'string'
        ? parseInt(raw.replace(/\D/g, ''), 10)
        : Number(raw);

    return (Number.isFinite(parsed) ? parsed : 30) + 5;
  };

  const getOccupiedSlotsCount = (durationWithRespiro: number) => Math.ceil(durationWithRespiro / 15);

  // Índice rápido para achar agendamento que COMEÇA exatamente no slot
  const appointmentsByKey = useMemo(() => {
    const map = new Map<string, Appointment>();
    for (const a of appointments) {
      if (!a || a.status === 'cancelado') continue;
      const key = `${a.date}|${normalize(a.barber)}|${a.time}`;
      map.set(key, a);
    }
    return map;
  }, [appointments]);

  // Set com TODOS slots ocupados (inclusive os do meio), para bloquear + e drop
  const occupiedSet = useMemo(() => {
    const set = new Set<string>();

    for (const a of appointments) {
      if (!a || a.status === 'cancelado') continue;

      const date = a.date;
      const barber = normalize(a.barber);
      const startMin = timeToMinutes(a.time);
      const slots = getOccupiedSlotsCount(getServiceDurationWithRespiro(a));

      for (let i = 0; i < slots; i++) {
        const m = startMin + i * 15;
        const hh = String(Math.floor(m / 60)).padStart(2, '0');
        const mm = String(m % 60).padStart(2, '0');
        const time = `${hh}:${mm}`;

        set.add(`${date}|${barber}|${time}`);
      }
    }

    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, services, openingTime, closingTime]);

  const isSlotOccupied = (date: string, barberName: string, slotTime: string) => {
    return occupiedSet.has(`${date}|${normalize(barberName)}|${slotTime}`);
  };

  const handleDragStart = (e: React.DragEvent, id: string, status?: string) => {
    if (status === 'finalizado') return e.preventDefault();
    setDraggingAppId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, barberName: string, slotTime: string, targetDate: string) => {
    e.preventDefault();
    if (!draggingAppId) return;

    // valida alvo ocupado
    if (isSlotOccupied(targetDate, barberName, slotTime)) {
      setDraggingAppId(null);
      return alert('Este horário já está ocupado.');
    }

    setLoading(true);
    try {
      await onUpdate(draggingAppId, { barber: barberName, time: slotTime, date: targetDate });
    } catch (error) {
      alert('Erro ao mover.');
    } finally {
      setLoading(false);
      setDraggingAppId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja excluir este agendamento?')) return;

    setLoading(true);
    try {
      await onDelete(id);
      setSelectedApp(null);
    } catch (error) {
      alert('Erro ao excluir.');
    } finally {
      setLoading(false);
    }
  };

  const handleServiceChange = (serviceName: string) => {
    const selectedService = services.find(s => s.name === serviceName);
    if (!selectedService) return;

    const rawDuration =
      typeof selectedService.duration === 'string'
        ? parseInt(selectedService.duration.replace(/\D/g, ''), 10)
        : Number(selectedService.duration);

    setNewBooking(prev => ({
      ...prev,
      service: selectedService.name,
      price: Number(selectedService.price) || 0,
      duration: Number.isFinite(rawDuration) ? rawDuration : 30
    }));
  };

  const handleFinalizeEncaixe = async () => {
    if (!newBooking.customerName || !newBooking.service) return alert('Preencha tudo!');

    // Evita encaixar em slot já ocupado
    if (isSlotOccupied(newBooking.date, newBooking.barber, newBooking.time)) {
      return alert('Este horário já está ocupado.');
    }

    setLoading(true);
    try {
      await onSave({
        ...newBooking,
        barbershop_id: barbershopId,
        status: 'confirmado',
        customerPhone: 'Balcão',
        created_by_admin: true
      });

      setIsModalOpen(false);
      setNewBooking({ customerName: '', barber: '', time: '', service: '', price: 0, date: '', duration: 30 });
    } catch (error) {
      alert('Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  if (!barbers || barbers.length === 0) return null;

  return (
    <div className="relative space-y-6 italic font-black">
      {/* CONTROLES */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-[#0a0b0e] border border-white/5 rounded-[2rem] p-4 gap-4">
        <div className="flex bg-white/5 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('day')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'day' ? 'bg-amber-500 text-black' : 'text-slate-500 hover:text-white'}`}
          >
            Dia
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'week' ? 'bg-amber-500 text-black' : 'text-slate-500 hover:text-white'}`}
          >
            Semana
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={navigatePrev} className="p-2 hover:bg-white/5 rounded-full text-amber-500 transition-colors">
            <ChevronLeft />
          </button>

          <div className="text-center">
            <h4 className="text-white font-black uppercase italic tracking-tighter">
              {viewMode === 'day'
                ? format(currentDate, "dd 'de' MMMM", { locale: ptBR })
                : `Semana de ${format(weekStart, 'dd/MM')}`}
            </h4>

            {/* Seletor do barbeiro no modo semana */}
            {viewMode === 'week' && (
              <div className="mt-2">
                <select
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] uppercase text-white font-black italic outline-none"
                  value={selectedBarberForWeek}
                  onChange={(e) => setSelectedBarberForWeek(e.target.value)}
                >
                  {barbers.map(b => (
                    <option key={b.id || b.name} value={b.name} className="bg-[#0a0b0e]">
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button onClick={navigateNext} className="p-2 hover:bg-white/5 rounded-full text-amber-500 transition-colors">
            <ChevronRight />
          </button>
        </div>

        <button
          onClick={() => setCurrentDate(new Date())}
          className="px-4 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl text-[10px] font-black uppercase"
        >
          Hoje
        </button>
      </div>

      {/* GRID */}
      <div className="bg-[#0a0b0e] border border-white/5 rounded-[3rem] p-6 shadow-2xl overflow-x-auto custom-scrollbar relative">
        {loading && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] z-[150] flex items-center justify-center rounded-[3rem]">
            <Loader2 className="animate-spin text-amber-500" size={40} />
          </div>
        )}

        <div className="min-w-[1000px]">
          <div className="grid grid-cols-[100px_repeat(auto-fit,minmax(140px,1fr))] gap-4 mb-8 sticky top-0 bg-[#0a0b0e] pb-4 border-b border-white/5 z-20">
            <div className="flex items-center justify-center text-slate-100 font-black text-[12px] uppercase italic">
              Horário
            </div>

            {(viewMode === 'day' ? barbers : weekDays).map((item, idx) => (
              <div key={idx} className="text-center p-4 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-amber-500 font-black uppercase italic text-xs">
                  {viewMode === 'day'
                    ? (item as Barber).name
                    : format(item as Date, 'eee dd/MM', { locale: ptBR })}
                </p>

                {viewMode === 'week' && (
                  <p className="text-[9px] text-slate-400 font-black uppercase mt-1">
                    {selectedBarberForWeek}
                  </p>
                )}
              </div>
            ))}
          </div>

          {timeSlots.map(slot => (
            <div key={slot} className="grid grid-cols-[100px_repeat(auto-fit,minmax(140px,1fr))] gap-4 mb-2 min-h-[60px]">
              <div className="flex items-center justify-center font-mono text-[15px] font-bold text-slate-100 border-r border-white/5">
                {slot}
              </div>

              {(viewMode === 'day' ? barbers : weekDays).map((colItem, idx) => {
                const targetDate =
                  viewMode === 'day'
                    ? format(currentDate, 'yyyy-MM-dd')
                    : format(colItem as Date, 'yyyy-MM-dd');

                const barberName = viewMode === 'day' ? (colItem as Barber).name : selectedBarberForWeek;

                const key = `${targetDate}|${normalize(barberName)}|${slot}`;
                const appStartingHere = appointmentsByKey.get(key);

                const isByAdmin = appStartingHere?.created_by_admin === true;
                const isFinalized = appStartingHere?.status === 'finalizado';

                const slotOccupied = isSlotOccupied(targetDate, barberName, slot);

                return (
                  <div
                    key={idx}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      // não permite dropar em slot ocupado (inclusive meio do atendimento)
                      if (slotOccupied) return;
                      handleDrop(e, barberName, slot, targetDate);
                    }}
                    className="relative rounded-xl p-0.5 flex flex-col min-h-[60px] bg-white/[0.01]"
                  >
                    {appStartingHere ? (
                      <div
                        draggable={!isFinalized}
                        onDragStart={(e) => handleDragStart(e, appStartingHere.id, appStartingHere.status)}
                        onClick={() => setSelectedApp(appStartingHere)}
                        style={{
                          height: `${getOccupiedSlotsCount(getServiceDurationWithRespiro(appStartingHere)) * 62 - 4}px`,
                          zIndex: 50
                        }}
                        className={`absolute top-0 left-0 right-0 m-0.5 text-black rounded-lg p-2 shadow-xl flex flex-col transition-all
                          ${isFinalized
                            ? 'bg-emerald-500 cursor-default opacity-80'
                            : isByAdmin
                              ? 'bg-amber-500 cursor-move hover:brightness-110'
                              : 'bg-cyan-400 cursor-move hover:brightness-110'
                          }`}
                      >
                        <div className="flex justify-between items-center leading-none mb-1">
                          <span className="bg-black/20 px-1 rounded text-[8px] font-bold">{appStartingHere.time}</span>
                          {isFinalized && <ShieldCheck size={10} className="text-black/60" />}
                        </div>
                        <p className="font-black text-[10px] uppercase truncate">{appStartingHere.customerName}</p>
                        <p className="text-[7px] font-bold opacity-70 uppercase truncate">{appStartingHere.service}</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (slotOccupied) return;
                          setNewBooking(prev => ({ ...prev, time: slot, date: targetDate, barber: barberName }));
                          setIsModalOpen(true);
                        }}
                        disabled={slotOccupied}
                        className={`absolute inset-0 flex items-center justify-center group transition-opacity
                          ${slotOccupied ? 'opacity-0 cursor-not-allowed' : 'opacity-0 hover:opacity-100'}`}
                        title={slotOccupied ? 'Horário ocupado' : 'Novo agendamento'}
                      >
                        <Plus size={14} className="text-amber-500/50" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* MODAL GESTÃO */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[#0f1115] border border-white/10 w-full max-w-sm rounded-[3rem] p-10 shadow-2xl text-center">
            <div className="flex justify-center mb-6">
              <div className={`p-5 rounded-full ${selectedApp.status === 'finalizado' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                {selectedApp.status === 'finalizado' ? <ShieldCheck size={40} /> : <User size={40} />}
              </div>
            </div>

            <h4 className="text-2xl font-black text-white uppercase italic mb-2">{selectedApp.customerName}</h4>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
              {selectedApp.service} - {selectedApp.time}
            </p>

            {selectedApp.status === 'finalizado' ? (
              <div className="bg-emerald-500 border-l-4 border-emerald-300 py-5 px-6 rounded-2xl mb-8 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-full">
                    <ShieldCheck size={20} className="text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-white text-[12px] font-black uppercase italic leading-none">Pagamento Confirmado</p>
                    <p className="text-emerald-100/60 text-[9px] mt-1 font-mono uppercase tracking-wider">
                      ID: {selectedApp.venda_id || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  onFinalize(selectedApp);
                  setSelectedApp(null);
                }}
                className="w-full bg-green-500 hover:bg-green-600 text-black py-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all mb-4"
              >
                <CheckCircle2 size={16} /> Finalizar Atendimento
              </button>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setSelectedApp(null)}
                className="bg-white/5 text-white py-4 rounded-2xl font-black uppercase text-[10px]"
              >
                Fechar
              </button>

              {selectedApp.status !== 'finalizado' && (
                <button
                  onClick={() => handleDelete(selectedApp.id)}
                  className="bg-red-500 text-white py-4 rounded-2xl font-black uppercase text-[10px]"
                >
                  Excluir
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL ENCAIXE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0f1115] border border-white/10 w-full max-w-md rounded-[3rem] p-10 shadow-2xl font-black italic">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-white italic uppercase">
                Novo <span className="text-amber-500">Agendamento</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white">
                <X />
              </button>
            </div>

            <div className="space-y-6 leading-none">
              <div className="space-y-2">
                <label className="text-amber-500 text-[10px] uppercase ml-2">Cliente</label>
                <input
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white font-bold italic outline-none focus:border-amber-500/50 transition-colors"
                  placeholder="Ex: João Silva"
                  value={newBooking.customerName}
                  onChange={e => setNewBooking({ ...newBooking, customerName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-amber-500 text-[10px] uppercase ml-2">Serviço</label>
                <select
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white font-bold italic outline-none focus:border-amber-500/50 transition-colors appearance-none"
                  value={newBooking.service}
                  onChange={e => handleServiceChange(e.target.value)}
                >
                  <option value="" disabled className="text-slate-500">Selecione um serviço</option>
                  {services.map(s => (
                    <option key={s.id} value={s.name} className="bg-slate-900 text-white">
                      {s.name} - R$ {Number(s.price).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-amber-500 text-[10px] uppercase ml-2">Duração (minutos)</label>
                <div className="flex items-center gap-4 bg-slate-900 border border-white/10 rounded-2xl p-4 focus-within:border-amber-500/50 transition-colors">
                  <Clock size={20} className="text-amber-500" />
                  <input
                    type="number"
                    step={5}
                    min={5}
                    className="bg-transparent w-full text-white font-bold italic outline-none"
                    value={newBooking.duration}
                    onChange={e => setNewBooking({ ...newBooking, duration: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
              </div>

              <button
                onClick={handleFinalizeEncaixe}
                disabled={loading || !newBooking.customerName || !newBooking.service}
                className="w-full bg-amber-500 text-black py-5 rounded-2xl font-black uppercase text-xs italic hover:bg-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Salvando...' : 'Confirmar Encaixe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendarView;
