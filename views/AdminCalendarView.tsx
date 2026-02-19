import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import '../index.css';
import { supabase } from '@/lib/supabase';
import {
  Plus,
  X,
  User,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  ShieldCheck,
  Calendar as CalendarIcon,
  AlertCircle,
  Phone,
  Search,
  XCircle,
  Navigation
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

type Customer = {
  id?: string;
  name: string;
  phone: string;
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
  barber: string;
  time: string;
  service: string;
  price?: number;
  date: string;
  duration?: number | string;
  status?: AppointmentStatus;
  created_by_admin?: boolean;
  venda_id?: string | null;
  customerPhone?: string;
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

const timeToMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const useCurrentTime = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return currentTime;
};

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
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [selectedBarberForWeek, setSelectedBarberForWeek] = useState<string>('');
  const [selectedBarberForDay, setSelectedBarberForDay] = useState<string>('');

  const [openingTime, setOpeningTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('20:00');

  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);

  const currentTime = useCurrentTime();
  const currentTimeLineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [newBooking, setNewBooking] = useState({
    customerName: '',
    customerPhone: '',
    barber_id: '',
    barber: '',
    time: '',
    service: '',
    price: 0,
    date: '',
    duration: 30
  });

  const [isMobile, setIsMobile] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState('');
  const [timeValidationMessage, setTimeValidationMessage] = useState('');

  const customerInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const SLOT_HEIGHT_DESKTOP = 64;
  const SLOT_HEIGHT_MOBILE = 76;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    if (barbers.length > 0) {
      if (!selectedBarberForWeek) setSelectedBarberForWeek(barbers[0].name);
      if (!selectedBarberForDay) setSelectedBarberForDay(barbers[0].name);
    }
  }, [barbers, selectedBarberForWeek, selectedBarberForDay]);

  useEffect(() => {
    const fetchAllCustomers = async () => {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .order('name');
      if (data) setAllCustomers(data);
    };
    if (barbershopId) fetchAllCustomers();
  }, [barbershopId]);

  useEffect(() => {
    if (newBooking.customerName.length >= 2) {
      const filtered = allCustomers.filter(c =>
        c.name.toLowerCase().includes(newBooking.customerName.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else setFilteredCustomers([]);
  }, [newBooking.customerName, allCustomers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        customerInputRef.current &&
        !customerInputRef.current.contains(event.target as Node)
      ) setShowSuggestions(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const [startHour] = openingTime.split(':').map(Number);
    const [endHour] = closingTime.split(':').map(Number);

    for (let hour = startHour; hour <= endHour; hour++) {
      ['00', '15', '30', '45'].forEach(min => {
        if (hour === endHour && min !== '00') return;
        slots.push(`${hour.toString().padStart(2, '0')}:${min}`);
      });
    }
    return slots;
  }, [openingTime, closingTime]);

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 0 }), [currentDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const navigateNext = () =>
    setCurrentDate(viewMode === 'day' ? addDays(currentDate, 1) : addWeeks(currentDate, 1));
  const navigatePrev = () =>
    setCurrentDate(viewMode === 'day' ? subDays(currentDate, 1) : subWeeks(currentDate, 1));

  const isToday = useMemo(() => {
    return format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  }, [currentDate]);

  const scrollToCurrentTime = useCallback(() => {
    if (currentTimeLineRef.current) {
      currentTimeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, []);

  const getCurrentTimePosition = useCallback(() => {
    const now = currentTime;
    const totalMinutesNow = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    const openingMinutes = timeToMinutes(openingTime);

    const minutesSinceOpening = totalMinutesNow - openingMinutes;
    const slotIndex = Math.floor(minutesSinceOpening / 15);
    const minutesIntoSlot = minutesSinceOpening % 15;

    return { slotIndex, minutesIntoSlot };
  }, [currentTime, openingTime]);

  const getServiceDuration = useCallback((appointment: Appointment | null): number => {
    if (!appointment) return 30;

    if (appointment.duration != null && appointment.duration !== '') {
      const d = typeof appointment.duration === 'string'
        ? parseInt(appointment.duration.replace(/\D/g, ''), 10)
        : Number(appointment.duration);
      return Number.isFinite(d) && d > 0 ? d : 30;
    }

    const serviceFromTable = services.find(s => normalize(s.name) === normalize(appointment.service));
    const raw = serviceFromTable?.duration;
    const parsed = raw == null
      ? 30
      : typeof raw === 'string'
        ? parseInt(raw.replace(/\D/g, ''), 10)
        : Number(raw);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
  }, [services]);

  const occupiedIntervals = useMemo(() => {
    const map = new Map<string, Array<{ start: number; end: number; appointmentId: string }>>();
    for (const app of appointments) {
      if (!app || app.status === 'cancelado') continue;
      const key = `${app.date}|${normalize(app.barber)}`;
      const startMinutes = timeToMinutes(app.time);
      const duration = getServiceDuration(app);
      const endMinutes = startMinutes + duration;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ start: startMinutes, end: endMinutes, appointmentId: app.id });
    }
    return map;
  }, [appointments, getServiceDuration]);

  const isTimeOccupied = useCallback((date: string, barberName: string, timeStr: string): boolean => {
    const key = `${date}|${normalize(barberName)}`;
    const intervals = occupiedIntervals.get(key);
    if (!intervals || intervals.length === 0) return false;

    const checkStart = timeToMinutes(timeStr);
    const found = intervals.find(interval => checkStart >= interval.start && checkStart < interval.end);
    return !!found;
  }, [occupiedIntervals]);

  const isIntervalAvailable = useCallback((
    date: string,
    barberName: string,
    startTime: string,
    durationMinutes: number,
    ignoreAppointmentId?: string
  ): boolean => {
    const key = `${date}|${normalize(barberName)}`;
    const intervals = occupiedIntervals.get(key);

    if (!intervals || intervals.length === 0) return true;

    const newStart = timeToMinutes(startTime);
    const newEnd = newStart + durationMinutes;

    return !intervals.some(interval => {
      if (ignoreAppointmentId && interval.appointmentId === ignoreAppointmentId) return false;

      const hasOverlap = newStart < interval.end && newEnd > interval.start;
      return hasOverlap;
    });
  }, [occupiedIntervals]);

  const findNextAvailableTime = useCallback((
    date: string,
    barberName: string,
    startTime: string,
    duration: number
  ): string | null => {
    const startMinutes = timeToMinutes(startTime);
    const endOfDay = timeToMinutes(closingTime);

    for (let minutes = startMinutes; minutes + duration <= endOfDay; minutes += 5) {
      const testTime = minutesToTime(minutes);
      if (isIntervalAvailable(date, barberName, testTime, duration)) return testTime;
    }
    return null;
  }, [closingTime, isIntervalAvailable]);

  const appointmentsByGridSlot = useMemo(() => {
    const map = new Map<string, Appointment>();
    for (const app of appointments) {
      if (!app || app.status === 'cancelado') continue;

      const start = timeToMinutes(app.time);
      const gridStart = Math.floor(start / 15) * 15;
      const gridTime = minutesToTime(gridStart);

      const key = `${app.date}|${normalize(app.barber)}|${gridTime}`;
      map.set(key, app);
    }
    return map;
  }, [appointments]);

  const getAppointmentHeightDesktop = useCallback((appointment: Appointment): number => {
    const duration = getServiceDuration(appointment);
    return (duration / 15) * SLOT_HEIGHT_DESKTOP - 8;
  }, [getServiceDuration]);

  const getAppointmentHeightMobile = useCallback((appointment: Appointment): number => {
    const duration = getServiceDuration(appointment);
    return (duration / 15) * SLOT_HEIGHT_MOBILE - 12;
  }, [getServiceDuration]);

  const getTopOffsetWithinSlot = useCallback((appointment: Appointment, slot: string, isMobileMode: boolean) => {
    const slotStart = timeToMinutes(slot);
    const appStart = timeToMinutes(appointment.time);
    const diff = Math.max(0, appStart - slotStart);
    const pxPerMinute = (isMobileMode ? SLOT_HEIGHT_MOBILE : SLOT_HEIGHT_DESKTOP) / 15;
    return diff * pxPerMinute;
  }, []);

  const isFullHour = (slot: string): boolean => slot.endsWith(':00');

  const handleDragStart = (e: React.DragEvent, id: string, status?: string) => {
    if (status === 'finalizado' || isMobile) return e.preventDefault();
    setDraggingAppId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, barberName: string, slotTime: string, targetDate: string) => {
    e.preventDefault();
    if (!draggingAppId || isMobile) return;

    const draggedApp = appointments.find(a => a.id === draggingAppId);
    if (!draggedApp) return;

    const duration = getServiceDuration(draggedApp);
    const originalMinutes = timeToMinutes(draggedApp.time) % 15;
    const slotStart = timeToMinutes(slotTime);
    const newTime = minutesToTime(slotStart + originalMinutes);

    const available = isIntervalAvailable(targetDate, barberName, newTime, duration, draggedApp.id);
    if (!available) {
      setDraggingAppId(null);
      return alert('⚠️ Este horário está ocupado ou há conflito de agenda.');
    }

    setLoading(true);
    try {
      await onUpdate(draggingAppId, { barber: barberName, time: newTime, date: targetDate });
    } catch (error) {
      console.error('❌ Erro ao mover agendamento:', error);
      alert('❌ Erro ao mover agendamento.');
    } finally {
      setLoading(false);
      setDraggingAppId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('⚠️ Deseja realmente excluir este agendamento?')) return;

    setLoading(true);
    try {
      await onDelete(id);
      setSelectedApp(null);
    } catch (error) {
      console.error('❌ Erro ao excluir:', error);
      alert('❌ Erro ao excluir agendamento.');
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

    const duration = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 30;

    setNewBooking(prev => ({
      ...prev,
      service: selectedService.name,
      price: Number(selectedService.price) || 0,
      duration
    }));

    if (customTimeInput) validateCustomTime(customTimeInput, duration);
  };

  const validateCustomTime = useCallback((time: string, duration?: number) => {
    if (!time || !newBooking.date || !newBooking.barber) {
      setTimeValidationMessage('');
      return;
    }

    const durationToUse = duration || newBooking.duration;
    const available = isIntervalAvailable(newBooking.date, newBooking.barber, time, durationToUse);

    if (available) {
      setTimeValidationMessage('✅ Horário disponível!');
      setNewBooking(prev => ({ ...prev, time }));
    } else {
      const nextAvailable = findNextAvailableTime(newBooking.date, newBooking.barber, time, durationToUse);
      if (nextAvailable) setTimeValidationMessage(`⚠️ Ocupado. Próximo livre: ${nextAvailable}`);
      else setTimeValidationMessage('❌ Sem horários disponíveis após este horário hoje.');
    }
  }, [newBooking.date, newBooking.barber, newBooking.duration, isIntervalAvailable, findNextAvailableTime]);

  const handleCustomTimeChange = (time: string) => {
    setCustomTimeInput(time);
    validateCustomTime(time);
  };

  const handleUseSuggestedTime = () => {
    const match = timeValidationMessage.match(/(\d{2}:\d{2})/);
    if (!match) return;
    const suggestedTime = match[1];
    setCustomTimeInput(suggestedTime);
    setNewBooking(prev => ({ ...prev, time: suggestedTime }));
    setTimeValidationMessage('✅ Horário disponível!');
  };

  const handleFinalizeEncaixe = async () => {
    if (!newBooking.customerName || !newBooking.service) return alert('⚠️ Preencha todos os campos obrigatórios!');
    if (!newBooking.time) return alert('⚠️ Selecione um horário válido!');

    const available = isIntervalAvailable(newBooking.date, newBooking.barber, newBooking.time, newBooking.duration);
    if (!available) return alert('⚠️ Este horário já está ocupado ou há conflito de agenda.');

    setLoading(true);
    try {
      const payload = {
        ...newBooking,
        barbershop_id: barbershopId,
        status: 'confirmado',
        customerPhone: newBooking.customerPhone || 'Balcão',
        created_by_admin: true
      };
      await onSave(payload);

      setIsModalOpen(false);
      setNewBooking({
        customerName: '',
        customerPhone: '',
        barber: '',
        time: '',
        service: '',
        price: 0,
        date: '',
        duration: 30
      });
      setCustomTimeInput('');
      setTimeValidationMessage('');
      setShowSuggestions(false);
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      alert('❌ Erro ao salvar agendamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeAppointment = () => {
    if (!selectedApp) return;
    onFinalize({ ...selectedApp });
    setSelectedApp(null);
  };

  const handleSlotClick = (slot: string, date: string, barber: string, isOccupied: boolean) => {
    const selectedBarberObj = barbers.find(b => b.name === barber);
    if (isOccupied) {
      const nextTime = findNextAvailableTime(date, barber, slot, 30);
      if (nextTime) {
        if (window.confirm(`⚠️ ${slot} está ocupado.\n\n✅ Próximo horário disponível: ${nextTime}\n\nDeseja agendar para este horário?`)) {
          setCustomTimeInput(nextTime);
          setNewBooking(prev => ({ ...prev, time: nextTime, date, barber, barber_id: selectedBarberObj?.id }));
          setTimeValidationMessage('✅ Horário disponível!');
          setIsModalOpen(true);
        }
      } else alert('❌ Não há mais horários disponíveis hoje para este barbeiro.');
      return;
    }

    setCustomTimeInput(slot);
    setNewBooking(prev => ({ ...prev, time: slot, date, barber, barber_id: selectedBarberObj?.id }));
    setTimeValidationMessage('');
    setIsModalOpen(true);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setNewBooking(prev => ({ ...prev, customerName: customer.name, customerPhone: customer.phone }));
    setShowSuggestions(false);
  };

  if (!barbers || barbers.length === 0) return null;

  if (isMobile) {
    const targetDate = format(currentDate, 'yyyy-MM-dd');
    const activeBarber = viewMode === 'day' ? selectedBarberForDay : selectedBarberForWeek;

    const mobileStartsBySlot = new Map<string, Appointment>();
    for (const slot of timeSlots) {
      const key = `${targetDate}|${normalize(activeBarber)}|${slot}`;
      const app = appointmentsByGridSlot.get(key);
      if (app) mobileStartsBySlot.set(slot, app);
    }

    const { slotIndex: currentSlotIndex, minutesIntoSlot: currentMinutesIntoSlot } = getCurrentTimePosition();
    const currentTimeTopPosition = (currentSlotIndex * SLOT_HEIGHT_MOBILE) + (currentMinutesIntoSlot / 15) * SLOT_HEIGHT_MOBILE;

    return (
      <div className="relative space-y-4 pb-20 italic font-black">
        <div className="bg-gradient-to-br from-[#0f141c] via-[#111827] to-[#0b1020] border border-white/15 rounded-3xl p-4 space-y-4 sticky top-0 z-30 shadow-2xl backdrop-blur-xl">
          <div className="flex justify-between items-center">
            <button onClick={navigatePrev} className="p-3 hover:bg-white/10 rounded-full text-amber-400 transition-all active:scale-95">
              <ChevronLeft size={20} />
            </button>

            <div className="text-center flex-1">
              <h4 className="text-white font-black uppercase italic text-sm tracking-tight">
                {format(currentDate, "dd 'de' MMMM", { locale: ptBR })}
              </h4>
              <p className="text-[9px] text-slate-300/70 uppercase mt-1">
                {format(currentDate, 'EEEE', { locale: ptBR })}
              </p>
            </div>

            <button onClick={navigateNext} className="p-3 hover:bg-white/10 rounded-full text-amber-400 transition-all active:scale-95">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2 bg-white/7 rounded-2xl p-3 border border-white/15">
            <User size={16} className="text-amber-400" />
            <select
              className="flex-1 bg-transparent text-white text-xs font-black uppercase outline-none"
              value={activeBarber}
              onChange={(e) => {
                if (viewMode === 'day') setSelectedBarberForDay(e.target.value);
                else setSelectedBarberForWeek(e.target.value);
              }}
            >
              {barbers.map(b => (
                <option key={b.id || b.name} value={b.name} className="bg-[#0b1020]">
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setCurrentDate(new Date())}
            className="w-full px-3 py-2 bg-amber-500/15 text-amber-300 border border-amber-400/40 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-amber-500/20 transition-all active:scale-95"
          >
            <CalendarIcon size={12} />
            Ir para Hoje
          </button>
        </div>

        {loading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center">
            <div className="bg-[#111827] border border-white/15 rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl">
              <Loader2 className="animate-spin text-amber-400" size={40} />
              <p className="text-white text-sm font-black uppercase italic">Processando...</p>
            </div>
          </div>
        )}

        <div className="px-2" ref={scrollContainerRef}>
          <div className="relative rounded-3xl border border-white/15 bg-gradient-to-br from-[#0f141c] via-[#111827] to-[#0b1020] shadow-2xl overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              {timeSlots.map((slot, i) => {
                const full = isFullHour(slot);
                return (
                  <div
                    key={slot}
                    style={{ top: i * SLOT_HEIGHT_MOBILE }}
                    className={`absolute left-0 right-0 ${full ? 'h-[2px] bg-white/15' : 'h-[1px] bg-white/8'}`}
                  />
                );
              })}
            </div>

            {isToday && (
              <div
                ref={currentTimeLineRef}
                className="absolute left-0 right-0 z-[70] pointer-events-none transition-all duration-1000 ease-linear"
                style={{ top: `${currentTimeTopPosition}px` }}
              >
                <div className="relative w-full flex items-center">
                  <div className="absolute -left-1 w-3 h-3 bg-red-500 rounded-full shadow-[0_0_12px_#ef4444] animate-pulse" />
                  <div className="w-full h-[2px] bg-red-500 opacity-90 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                </div>
              </div>
            )}

            <div className="relative">
              {timeSlots.map((slot) => {
                const isFullHourSlot = isFullHour(slot);
                const startApp = mobileStartsBySlot.get(slot);
                const slotOccupied = isTimeOccupied(targetDate, activeBarber, slot);
                const isStart = Boolean(startApp);

                return (
                  <div key={slot} className="relative" style={{ height: SLOT_HEIGHT_MOBILE }}>
                    <div className="absolute left-0 top-0 bottom-0 w-[82px] flex items-center justify-center border-r border-white/15 bg-black/10">
                      <span className={`font-mono text-[12px] font-bold ${isFullHourSlot ? 'text-amber-300' : 'text-slate-200'}`}>
                        {slot}
                      </span>
                    </div>

                    {!slotOccupied && (
                      <button
                        onClick={() => handleSlotClick(slot, targetDate, activeBarber, false)}
                        className="absolute left-[82px] right-0 top-0 bottom-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-all"
                        title="Novo agendamento"
                      >
                        <div className="flex items-center gap-2 text-amber-300/80">
                          <Plus size={16} />
                          <span className="text-[10px] font-black uppercase">Disponível</span>
                        </div>
                      </button>
                    )}

                    {slotOccupied && !isStart && (
                      <button
                        onClick={() => handleSlotClick(slot, targetDate, activeBarber, true)}
                        className="absolute left-[82px] right-0 top-0 bottom-0 flex items-center justify-end pr-4 opacity-70 hover:opacity-100 transition-all"
                        title="Ver próximo horário livre"
                      >
                        <XCircle size={16} className="text-red-400/80" />
                      </button>
                    )}

                    {startApp && (
                      <button
                        onClick={() => setSelectedApp(startApp)}
                        className={`absolute left-[90px] right-2 z-30 rounded-2xl p-4 border-2 text-left overflow-hidden shadow-2xl transition-all active:scale-[0.99]
                          ${startApp.status === 'finalizado'
                            ? 'bg-emerald-500/15 border-emerald-400/45 shadow-emerald-500/20'
                            : startApp.created_by_admin
                              ? 'bg-amber-500/15 border-amber-400/45 shadow-amber-500/20'
                              : 'bg-cyan-400/15 border-cyan-300/45 shadow-cyan-500/20'
                          }`}
                        style={{
                          top: 6 + getTopOffsetWithinSlot(startApp, slot, true),
                          height: `${getAppointmentHeightMobile(startApp)}px`
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-70" />

                        <div className="relative z-10 flex justify-between items-start mb-2">
                          <div className="space-y-1">
                            <span className="font-mono text-xs font-bold text-white bg-black/25 px-2 py-1 rounded backdrop-blur-sm">
                              {startApp.time}
                            </span>
                            <span className="block text-[9px] text-slate-200/70 ml-1">
                              até {minutesToTime(timeToMinutes(startApp.time) + getServiceDuration(startApp))}
                            </span>
                          </div>

                          {startApp.status === 'finalizado' && (
                            <div className="bg-emerald-500/25 p-1.5 rounded-full backdrop-blur-sm">
                              <ShieldCheck size={14} className="text-emerald-300" />
                            </div>
                          )}
                        </div>

                        <p className="relative z-10 text-white font-black text-sm uppercase mb-1">
                          {startApp.customerName}
                        </p>
                        <p className="relative z-10 text-slate-100/75 text-[10px] font-bold uppercase">
                          {startApp.service}
                        </p>

                        <div className="relative z-10 flex items-center gap-1 mt-2 text-[9px] text-slate-100/60">
                          <Clock size={10} />
                          {getServiceDuration(startApp)} min
                        </div>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {isToday && (
          <button
            onClick={scrollToCurrentTime}
            className="fixed bottom-24 right-4 z-40 p-4 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-full shadow-2xl shadow-red-500/40 hover:shadow-red-500/60 active:scale-95 transition-all border-2 border-white/20 backdrop-blur-sm"
            title="Ir para horário atual"
          >
            <Navigation size={20} className="animate-pulse" />
          </button>
        )}

        {selectedApp && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-[#111827] to-[#0b1020] border border-white/15 w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center">
              <div className="flex justify-center mb-4">
                <div className={`p-4 rounded-full ${selectedApp.status === 'finalizado' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                  {selectedApp.status === 'finalizado' ? <ShieldCheck size={32} /> : <User size={32} />}
                </div>
              </div>

              <h4 className="text-xl font-black text-white uppercase italic mb-1">{selectedApp.customerName}</h4>
              <p className="text-slate-200/70 text-[9px] font-black uppercase tracking-wider mb-2">
                {selectedApp.service}
              </p>
              <p className="text-slate-200/70 text-[9px] mb-6">
                {selectedApp.time} - {minutesToTime(timeToMinutes(selectedApp.time) + getServiceDuration(selectedApp))} ({getServiceDuration(selectedApp)}min)
              </p>

              {selectedApp.status === 'finalizado' ? (
                <div className="bg-emerald-500/15 border border-emerald-400/25 py-4 px-4 rounded-2xl mb-6">
                  <div className="flex items-center gap-2">
                    <div className="bg-white/15 p-2 rounded-full">
                      <ShieldCheck size={16} className="text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-white text-[11px] font-black uppercase italic leading-none">Pagamento Confirmado</p>
                      <p className="text-emerald-100/70 text-[8px] mt-1 font-mono uppercase tracking-wider">
                        ID: {selectedApp.venda_id || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleFinalizeAppointment}
                    className="w-full bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-black py-3 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all mb-3 active:scale-95"
                  >
                    <CheckCircle2 size={14} /> Finalizar Atendimento
                  </button>

                  {selectedApp.customerPhone && selectedApp.customerPhone !== 'Balcão' && (
                    <a
                      href={`https://wa.me/55${selectedApp.customerPhone.replace(/\D/g, '')}?text=Olá ${selectedApp.customerName}, confirmando seu horário na Barbearia para o dia ${format(parseISO(selectedApp.date), 'dd/MM')} às ${selectedApp.time}.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] py-3 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all border border-[#25D366]/35 mb-3 active:scale-95"
                    >
                      <Phone size={14} /> Enviar Lembrete WhatsApp
                    </a>
                  )}
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedApp(null)}
                  className="bg-white/8 text-white py-3 rounded-2xl font-black uppercase text-[9px] hover:bg-white/12 transition-all active:scale-95 border border-white/12"
                >
                  Fechar
                </button>

                {selectedApp.status !== 'finalizado' && (
                  <button
                    onClick={() => handleDelete(selectedApp.id)}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 rounded-2xl font-black uppercase text-[9px] transition-all active:scale-95"
                  >
                    Excluir
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-[#111827] to-[#0b1020] border border-white/15 w-full max-w-md rounded-3xl p-6 shadow-2xl font-black italic max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-white italic uppercase">
                  Novo <span className="text-amber-300">Agendamento</span>
                </h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setCustomTimeInput('');
                    setTimeValidationMessage('');
                    setShowSuggestions(false);
                  }}
                  className="text-slate-300/60 hover:text-white transition-colors hover:rotate-90 transition-transform"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 leading-none">
                <div className="space-y-2 relative">
                  <label className="text-amber-300 text-[10px] uppercase ml-2 flex justify-between items-center">
                    <span>Cliente</span>
                    {newBooking.customerPhone && newBooking.customerPhone !== 'Balcão' && (
                      <a
                        href={`https://wa.me/55${newBooking.customerPhone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 flex items-center gap-1 hover:text-green-300 transition-colors lowercase font-bold text-[9px]"
                      >
                        <Phone size={10} /> chamar no whatsapp
                      </a>
                    )}
                  </label>

                  <div className="relative">
                    <input
                      ref={customerInputRef}
                      className="w-full bg-white/5 border border-white/15 rounded-2xl p-4 text-white font-bold italic outline-none focus:border-amber-300/60 transition-all pr-10 shadow-inner"
                      placeholder="Nome do cliente..."
                      value={newBooking.customerName}
                      onFocus={() => setShowSuggestions(true)}
                      onChange={e => {
                        setNewBooking({ ...newBooking, customerName: e.target.value, customerPhone: '' });
                        setShowSuggestions(true);
                      }}
                    />
                    <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300/60" />

                    {showSuggestions && filteredCustomers.length > 0 && (
                      <div
                        ref={suggestionsRef}
                        className="absolute z-[120] w-full bg-[#0b1020]/95 backdrop-blur-xl border border-white/15 rounded-2xl mt-2 max-h-52 overflow-y-auto shadow-2xl custom-scrollbar"
                      >
                        {filteredCustomers.map(customer => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => handleSelectCustomer(customer)}
                            className="w-full text-left p-4 hover:bg-amber-400/10 border-b border-white/10 last:border-0 transition-colors group"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-white font-black uppercase text-xs italic group-hover:text-amber-300 transition-colors">
                                {customer.name}
                              </span>
                              <span className="text-slate-200/70 font-mono text-[10px]">
                                {customer.phone}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {showSuggestions && newBooking.customerName.length >= 2 && filteredCustomers.length === 0 && (
                      <div
                        ref={suggestionsRef}
                        className="absolute z-[120] w-full bg-[#0b1020]/95 backdrop-blur-xl border border-white/15 rounded-2xl mt-2 p-4 shadow-2xl"
                      >
                        <p className="text-slate-200/60 text-[10px] uppercase font-black italic">
                          Nenhum cliente cadastrado com este nome
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-amber-300 text-[9px] uppercase ml-2">Serviço</label>
                  <select
                    className="w-full bg-white/5 border border-white/15 rounded-2xl p-3 text-white text-sm font-bold italic outline-none focus:border-amber-300/60 transition-all appearance-none shadow-inner"
                    value={newBooking.service}
                    onChange={e => handleServiceChange(e.target.value)}
                  >
                    <option value="" disabled className="text-slate-400">Selecione</option>
                    {services.map(s => (
                      <option key={s.id} value={s.name} className="bg-[#0b1020] text-white">
                        {s.name} - R$ {Number(s.price).toFixed(2)} ({s.duration}min)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-amber-300 text-[9px] uppercase ml-2">Duração (min)</label>
                  <div className="flex items-center gap-3 bg-white/5 border border-white/15 rounded-2xl p-3 focus-within:border-amber-300/60 transition-all shadow-inner">
                    <Clock size={16} className="text-amber-300" />
                    <input
                      type="number"
                      step={5}
                      min={5}
                      className="bg-transparent w-full text-white text-sm font-bold italic outline-none"
                      value={newBooking.duration}
                      onChange={e => {
                        const newDuration = parseInt(e.target.value, 10) || 30;
                        setNewBooking({ ...newBooking, duration: newDuration });
                        if (customTimeInput) validateCustomTime(customTimeInput, newDuration);
                      }}
                    />
                  </div>
                  {newBooking.time && (
                    <p className="text-[8px] text-slate-200/60 ml-2">
                      Término: {minutesToTime(timeToMinutes(newBooking.time) + newBooking.duration)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-amber-300 text-[9px] uppercase ml-2 flex items-center gap-1">
                    <Clock size={10} />
                    Horário Personalizado
                  </label>
                  <input
                    type="time"
                    step="60"
                    className="w-full bg-white/5 border border-white/15 rounded-2xl p-3 text-white text-sm font-bold italic outline-none focus:border-amber-300/60 transition-all shadow-inner"
                    value={customTimeInput}
                    onChange={e => handleCustomTimeChange(e.target.value)}
                  />

                  {timeValidationMessage && (
                    <div className={`flex items-start gap-2 p-3 rounded-xl text-[9px] backdrop-blur-sm border ${timeValidationMessage.startsWith('✅')
                      ? 'bg-green-500/10 text-green-300 border-green-400/25'
                      : timeValidationMessage.startsWith('⚠️')
                        ? 'bg-amber-500/10 text-amber-200 border-amber-400/25'
                        : 'bg-red-500/10 text-red-200 border-red-400/25'
                      }`}>
                      <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-bold">{timeValidationMessage}</p>
                        {timeValidationMessage.startsWith('⚠️') && (
                          <button
                            onClick={handleUseSuggestedTime}
                            className="mt-2 px-3 py-1 bg-gradient-to-r from-amber-300 to-amber-400 text-black rounded-lg text-[8px] font-black uppercase hover:brightness-110 transition-all active:scale-95"
                          >
                            Usar este horário
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="text-[8px] text-slate-200/60 ml-2">
                    💡 Digite qualquer horário. O sistema verificará disponibilidade em tempo real.
                  </p>
                </div>

                <button
                  onClick={handleFinalizeEncaixe}
                  disabled={loading || !newBooking.customerName || !newBooking.service || !newBooking.time || !timeValidationMessage.startsWith('✅')}
                  className="w-full bg-gradient-to-r from-amber-300 to-amber-400 text-black py-4 rounded-2xl font-black uppercase text-xs italic hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    'Confirmar Encaixe'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative space-y-6 italic font-black">
      <div className="flex flex-col md:flex-row justify-between items-center bg-gradient-to-br from-[#0f141c] via-[#111827] to-[#0b1020] border border-white/15 rounded-[2rem] p-4 gap-4 shadow-2xl">
        <div className="flex bg-white/7 p-1 rounded-xl border border-white/15">
          <button
            onClick={() => setViewMode('day')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'day'
              ? 'bg-gradient-to-r from-amber-300 to-amber-400 text-black shadow-lg shadow-amber-500/20'
              : 'text-slate-200/70 hover:text-white hover:bg-white/5'
              }`}
          >
            Dia
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'week'
              ? 'bg-gradient-to-r from-amber-300 to-amber-400 text-black shadow-lg shadow-amber-500/20'
              : 'text-slate-200/70 hover:text-white hover:bg-white/5'
              }`}
          >
            Semana
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={navigatePrev} className="p-2 hover:bg-white/10 rounded-full text-amber-300 transition-all">
            <ChevronLeft />
          </button>

          <div className="text-center">
            <h4 className="text-white font-black uppercase italic tracking-tighter">
              {viewMode === 'day'
                ? format(currentDate, "dd 'de' MMMM", { locale: ptBR })
                : `Semana de ${format(weekStart, 'dd/MM')}`}
            </h4>

            {viewMode === 'week' && (
              <div className="mt-2 relative group">
                <select
                  className="appearance-none w-full bg-white/10 border border-white/15 rounded-xl px-4 py-2 pr-8 text-[10px] uppercase text-white font-black italic outline-none hover:bg-white/15 transition-all backdrop-blur-sm cursor-pointer"
                  value={selectedBarberForWeek}
                  onChange={(e) => setSelectedBarberForWeek(e.target.value)}
                >
                  {barbers.map(b => (
                    <option key={b.id || b.name} value={b.name} className="bg-[#0b1020] text-white">
                      {b.name}
                    </option>
                  ))}
                </select>

                {/* Ícone de seta personalizado para garantir visibilidade */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-amber-400 group-hover:text-white transition-colors">
                  <ChevronDown size={14} />
                </div>
              </div>
            )}
          </div>

          <button onClick={navigateNext} className="p-2 hover:bg-white/10 rounded-full text-amber-300 transition-all">
            <ChevronRight />
          </button>
        </div>

        <button
          onClick={() => setCurrentDate(new Date())}
          className="px-4 py-2 bg-amber-500/15 text-amber-200 border border-amber-400/40 rounded-xl text-[10px] font-black uppercase hover:bg-amber-500/20 transition-all"
        >
          Hoje
        </button>
      </div>

      <div className="bg-gradient-to-br from-[#0f141c] via-[#111827] to-[#0b1020] border border-white/15 rounded-[3rem] p-6 shadow-2xl overflow-x-auto custom-scrollbar relative" ref={scrollContainerRef}>
        {loading && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] z-[150] flex items-center justify-center rounded-[3rem]">
            <div className="bg-[#111827] border border-white/15 rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl">
              <Loader2 className="animate-spin text-amber-300" size={40} />
              <p className="text-white text-sm font-black uppercase italic">Processando...</p>
            </div>
          </div>
        )}

        <div className="min-w-[1000px]">
          <div className="grid grid-cols-[110px_repeat(auto-fit,minmax(160px,1fr))] gap-4 mb-8 sticky top-0 bg-gradient-to-br from-[#0f141c] to-[#111827] pb-4 border-b border-white/12 z-20 backdrop-blur-xl">
            <div className="flex items-center justify-center text-slate-100 font-black text-[12px] uppercase italic">
              Horário
            </div>

            {(viewMode === 'day' ? barbers : weekDays).map((item, idx) => (
              <div key={idx} className="text-center p-4 bg-white/7 rounded-2xl border border-white/15 shadow-lg">
                <p className="text-amber-300 font-black uppercase italic text-xs">
                  {viewMode === 'day'
                    ? (item as Barber).name
                    : format(item as Date, 'eee dd/MM', { locale: ptBR })}
                </p>

                {viewMode === 'week' && (
                  <p className="text-[9px] text-slate-200/70 font-black uppercase mt-1">
                    {selectedBarberForWeek}
                  </p>
                )}
              </div>
            ))}
          </div>

          {timeSlots.map((slot, slotIndex) => {
            const isFullHourSlot = isFullHour(slot);
            const targetDateDay = format(currentDate, 'yyyy-MM-dd');
            const { slotIndex: currentSlotIndex, minutesIntoSlot: currentMinutesIntoSlot } = getCurrentTimePosition();
            const isCurrentSlot = isToday && slotIndex === currentSlotIndex;

            return (
              <div key={slot} className="relative">
                <div
                  className={`absolute left-0 right-0 ${isFullHourSlot ? 'h-[2px] bg-white/15' : 'h-[1px] bg-white/8'
                    } ${slotIndex === 0 ? 'top-0' : '-top-1'}`}
                />

                {isCurrentSlot && (
                  <div
                    ref={currentTimeLineRef}
                    className="absolute left-0 right-0 z-[70] pointer-events-none transition-all duration-1000 ease-linear"
                    style={{
                      top: `${(currentMinutesIntoSlot / 15) * 100}%`,
                    }}
                  >
                    <div className="relative w-full">
                      <div className="absolute -left-1 -top-[5px] w-3 h-3 bg-red-500 rounded-full shadow-[0_0_15px_#ef4444] animate-pulse" />
                      <div className="w-full h-[2px] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-[110px_repeat(auto-fit,minmax(160px,1fr))] gap-4 mb-2 min-h-[64px]">
                  <div className={`flex items-center justify-center font-mono text-[15px] font-bold border-r border-white/15 ${isFullHourSlot ? 'text-amber-300' : 'text-slate-100'
                    }`}>
                    {slot}
                  </div>

                  {(viewMode === 'day' ? barbers : weekDays).map((colItem, idx) => {
                    const targetDate =
                      viewMode === 'day'
                        ? format(currentDate, 'yyyy-MM-dd')
                        : format(colItem as Date, 'yyyy-MM-dd');

                    const barberName = viewMode === 'day' ? (colItem as Barber).name : selectedBarberForWeek;

                    const key = `${targetDate}|${normalize(barberName)}|${slot}`;
                    const appStartingHere = appointmentsByGridSlot.get(key);

                    const isByAdmin = appStartingHere?.created_by_admin === true;
                    const isFinalized = appStartingHere?.status === 'finalizado';

                    const slotOccupied = isTimeOccupied(targetDate, barberName, slot);

                    return (
                      <div
                        key={idx}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          if (slotOccupied) return;
                          handleDrop(e, barberName, slot, targetDate);
                        }}
                        className="relative rounded-2xl min-h-[64px] bg-white/[0.03] border border-white/10"
                      >
                        {slotOccupied && !appStartingHere && (
                          <div className="absolute inset-0 rounded-2xl bg-red-500/6 border border-red-400/15" />
                        )}

                        {appStartingHere ? (
                          <div
                            draggable={!isFinalized}
                            onDragStart={(e) => handleDragStart(e, appStartingHere.id, appStartingHere.status)}
                            onClick={() => setSelectedApp(appStartingHere)}
                            style={{
                              height: `${getAppointmentHeightDesktop(appStartingHere)}px`,
                              top: 6 + getTopOffsetWithinSlot(appStartingHere, slot, false),
                              zIndex: 50
                            }}
                            className={`absolute left-0 right-0 mx-1 text-black rounded-xl p-2 shadow-xl flex flex-col transition-all group overflow-hidden border
                              ${isFinalized
                                ? 'bg-emerald-500/90 border-emerald-200/40 cursor-default'
                                : isByAdmin
                                  ? 'bg-amber-400 border-amber-200/50 cursor-move hover:brightness-110'
                                  : 'bg-cyan-300 border-cyan-100/50 cursor-move hover:brightness-110'
                              }`}
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="flex justify-between items-center leading-none mb-1 relative z-10">
                              <span className="bg-black/20 px-1 rounded text-[8px] font-bold backdrop-blur-sm">
                                {appStartingHere.time}
                              </span>
                              {isFinalized && <ShieldCheck size={10} className="text-black/60" />}
                            </div>

                            <p className="font-black text-[10px] uppercase truncate relative z-10">
                              {appStartingHere.customerName}
                            </p>
                            <p className="text-[7px] font-bold opacity-70 uppercase truncate relative z-10">
                              {appStartingHere.service}
                            </p>
                            <p className="text-[7px] font-bold opacity-60 mt-auto relative z-10">
                              {getServiceDuration(appStartingHere)}min
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSlotClick(slot, targetDate, barberName, slotOccupied)}
                            className={`absolute inset-0 flex items-center justify-center group transition-all rounded-2xl ${slotOccupied
                              ? 'opacity-100 bg-red-500/6 hover:bg-red-500/10'
                              : 'opacity-0 hover:opacity-100 hover:bg-amber-300/10'
                              }`}
                            title={slotOccupied ? 'Ver próximo horário livre' : 'Novo agendamento'}
                          >
                            {slotOccupied ? (
                              <XCircle size={14} className="text-red-400/80 group-hover:text-red-300" />
                            ) : (
                              <Plus size={14} className="text-amber-200 group-hover:text-amber-100 group-hover:rotate-90 transition-transform" />
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isToday && (
        <button
          onClick={scrollToCurrentTime}
          className="fixed bottom-8 right-8 z-40 p-5 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-full shadow-2xl shadow-red-500/50 hover:shadow-red-500/70 hover:scale-110 active:scale-95 transition-all border-2 border-white/20 backdrop-blur-sm"
          title="Ir para horário atual"
        >
          <Navigation size={20} className="animate-pulse" />
        </button>
      )}

      {selectedApp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-[#111827] to-[#0b1020] border border-white/15 w-full max-w-sm rounded-[3rem] p-10 shadow-2xl text-center">
            <div className="flex justify-center mb-6">
              <div className={`p-5 rounded-full ${selectedApp.status === 'finalizado' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                {selectedApp.status === 'finalizado' ? <ShieldCheck size={40} /> : <User size={40} />}
              </div>
            </div>

            <h4 className="text-2xl font-black text-white uppercase italic mb-2">{selectedApp.customerName}</h4>
            <p className="text-slate-200/70 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
              {selectedApp.service}
            </p>
            <p className="text-slate-200/70 text-[9px] mb-8">
              {selectedApp.time} - {minutesToTime(timeToMinutes(selectedApp.time) + getServiceDuration(selectedApp))} ({getServiceDuration(selectedApp)}min)
            </p>

            {selectedApp.status === 'finalizado' ? (
              <div className="bg-emerald-500/15 border border-emerald-400/25 py-5 px-6 rounded-2xl mb-8">
                <div className="flex items-center gap-3">
                  <div className="bg-white/15 p-2 rounded-full">
                    <ShieldCheck size={20} className="text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-white text-[12px] font-black uppercase italic leading-none">Pagamento Confirmado</p>
                    <p className="text-emerald-100/70 text-[9px] mt-1 font-mono uppercase tracking-wider">
                      ID: {selectedApp.venda_id || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={handleFinalizeAppointment}
                  className="w-full bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-black py-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all mb-4"
                >
                  <CheckCircle2 size={16} /> Finalizar Atendimento
                </button>

                {selectedApp.customerPhone && selectedApp.customerPhone !== 'Balcão' && (
                  <a
                    href={`https://wa.me/55${selectedApp.customerPhone.replace(/\D/g, '')}?text=Olá ${selectedApp.customerName}, confirmando seu horário na Barbearia para o dia ${format(parseISO(selectedApp.date), 'dd/MM')} às ${selectedApp.time}.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] py-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all border border-[#25D366]/35 mb-4"
                  >
                    <Phone size={14} /> Enviar Lembrete WhatsApp
                  </a>
                )}
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setSelectedApp(null)}
                className="bg-white/8 text-white py-4 rounded-2xl font-black uppercase text-[10px] hover:bg-white/12 transition-all border border-white/12"
              >
                Fechar
              </button>

              {selectedApp.status !== 'finalizado' && (
                <button
                  onClick={() => handleDelete(selectedApp.id)}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-4 rounded-2xl font-black uppercase text-[10px] transition-all"
                >
                  Excluir
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-[#111827] to-[#0b1020] border border-white/15 w-full max-w-md rounded-[3rem] p-10 shadow-2xl font-black italic max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-white italic uppercase">
                Novo <span className="text-amber-300">Agendamento</span>
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setCustomTimeInput('');
                  setTimeValidationMessage('');
                  setShowSuggestions(false);
                }}
                className="text-slate-200/60 hover:text-white transition-all hover:rotate-90"
              >
                <X />
              </button>
            </div>

            <div className="space-y-6 leading-none">
              <div className="space-y-2 relative">
                <label className="text-amber-300 text-[10px] uppercase ml-2 flex justify-between items-center">
                  <span>Cliente</span>
                  {newBooking.customerPhone && newBooking.customerPhone !== 'Balcão' && (
                    <a
                      href={`https://wa.me/55${newBooking.customerPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 flex items-center gap-1 hover:text-green-300 transition-colors lowercase font-bold text-[9px]"
                    >
                      <Phone size={10} /> chamar no whatsapp
                    </a>
                  )}
                </label>

                <div className="relative">
                  <input
                    ref={customerInputRef}
                    className="w-full bg-white/5 border border-white/15 rounded-2xl p-4 text-white font-bold italic outline-none focus:border-amber-300/60 transition-all pr-10 shadow-inner"
                    placeholder="Ex: João Silva"
                    value={newBooking.customerName}
                    onFocus={() => setShowSuggestions(true)}
                    onChange={e => {
                      setNewBooking({ ...newBooking, customerName: e.target.value, customerPhone: '' });
                      setShowSuggestions(true);
                    }}
                  />
                  <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-200/60" />

                  {showSuggestions && filteredCustomers.length > 0 && (
                    <div
                      ref={suggestionsRef}
                      className="absolute z-[120] w-full bg-[#0b1020]/95 backdrop-blur-xl border border-white/15 rounded-2xl mt-2 max-h-64 overflow-y-auto shadow-2xl custom-scrollbar"
                    >
                      {filteredCustomers.map(customer => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => handleSelectCustomer(customer)}
                          className="w-full text-left p-4 hover:bg-amber-400/10 border-b border-white/10 last:border-0 transition-colors group"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-white font-black uppercase text-sm italic group-hover:text-amber-300 transition-colors">
                              {customer.name}
                            </span>
                            <span className="text-slate-200/70 font-mono text-[11px]">
                              {customer.phone}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {showSuggestions && newBooking.customerName.length >= 2 && filteredCustomers.length === 0 && (
                    <div
                      ref={suggestionsRef}
                      className="absolute z-[120] w-full bg-[#0b1020]/95 backdrop-blur-xl border border-white/15 rounded-2xl mt-2 p-4 shadow-2xl"
                    >
                      <p className="text-slate-200/60 text-[11px] uppercase font-black italic">
                        Nenhum cliente cadastrado com este nome
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-amber-300 text-[10px] uppercase ml-2">Serviço</label>
                <select
                  className="w-full bg-white/5 border border-white/15 rounded-2xl p-4 text-white font-bold italic outline-none focus:border-amber-300/60 transition-all appearance-none shadow-inner"
                  value={newBooking.service}
                  onChange={e => handleServiceChange(e.target.value)}
                >
                  <option value="" disabled className="text-slate-400">Selecione um serviço</option>
                  {services.map(s => (
                    <option key={s.id} value={s.name} className="bg-[#0b1020] text-white">
                      {s.name} - R$ {Number(s.price).toFixed(2)} ({s.duration}min)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-amber-300 text-[10px] uppercase ml-2">Duração (minutos)</label>
                <div className="flex items-center gap-4 bg-white/5 border border-white/15 rounded-2xl p-4 focus-within:border-amber-300/60 transition-all shadow-inner">
                  <Clock size={20} className="text-amber-300" />
                  <input
                    type="number"
                    step={5}
                    min={5}
                    className="bg-transparent w-full text-white font-bold italic outline-none"
                    value={newBooking.duration}
                    onChange={e => {
                      const newDuration = parseInt(e.target.value, 10) || 30;
                      setNewBooking({ ...newBooking, duration: newDuration });
                      if (customTimeInput) validateCustomTime(customTimeInput, newDuration);
                    }}
                  />
                </div>
                {newBooking.time && (
                  <p className="text-[9px] text-slate-200/60 ml-2">
                    Término previsto: {minutesToTime(timeToMinutes(newBooking.time) + newBooking.duration)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-amber-300 text-[10px] uppercase ml-2 flex items-center gap-2">
                  <Clock size={12} />
                  Horário Personalizado
                </label>
                <input
                  type="time"
                  step="60"
                  className="w-full bg-white/5 border border-white/15 rounded-2xl p-4 text-white font-bold italic outline-none focus:border-amber-300/60 transition-all shadow-inner"
                  value={customTimeInput}
                  onChange={e => handleCustomTimeChange(e.target.value)}
                />

                {timeValidationMessage && (
                  <div className={`flex items-start gap-3 p-4 rounded-xl text-[10px] backdrop-blur-sm border ${timeValidationMessage.startsWith('✅')
                    ? 'bg-green-500/10 text-green-300 border-green-400/25'
                    : timeValidationMessage.startsWith('⚠️')
                      ? 'bg-amber-500/10 text-amber-200 border-amber-400/25'
                      : 'bg-red-500/10 text-red-200 border-red-400/25'
                    }`}>
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-bold">{timeValidationMessage}</p>
                      {timeValidationMessage.startsWith('⚠️') && (
                        <button
                          onClick={handleUseSuggestedTime}
                          className="mt-2 px-4 py-2 bg-gradient-to-r from-amber-300 to-amber-400 text-black rounded-xl text-[9px] font-black uppercase hover:brightness-110 transition-all shadow-lg"
                        >
                          Usar este horário
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-[9px] text-slate-200/60 ml-2">
                  💡 Digite qualquer horário. O sistema verificará disponibilidade automaticamente.
                </p>
              </div>

              <button
                onClick={handleFinalizeEncaixe}
                disabled={loading || !newBooking.customerName || !newBooking.service || !newBooking.time || !timeValidationMessage.startsWith('✅')}
                className="w-full bg-gradient-to-r from-amber-300 to-amber-400 text-black py-5 rounded-2xl font-black uppercase text-xs italic hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Salvando...
                  </span>
                ) : (
                  'Confirmar Encaixe'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendarView;